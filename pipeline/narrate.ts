// ナレーションを文ごとに区切り、public/audio/<id>/ に narration.wav と timing.json を書き出す。
//
//   npm run narrate -- <id>          videos/<id>/take.*（全文を1テイクで録った音声）を区切る
//   npm run narrate -- <id> --draft  macOS の say で仮音声を作る（区切りは各文の音声長から決まる）
//
// 録音は「文と文の間の無音が、文中の間より十分長い」ことを使って区切る。
// 区切りが曖昧なら止まるので、録り直すか videos/<id>/boundaries.json に
// 2文目以降の話し始め（テイク内の秒）を N-1 個並べて手動で指定する。

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { plainText, type Script, validateScript } from "../src/kit/script";
import { narrationPath, type Timing, timingPath } from "../src/kit/timing";

const exec = promisify(execFile);

const HEAD = 0.15; // 最初の発話の前に残す無音（秒）
const TAIL = 0.6; // 最後の発話の後に残す間
const LEAD = 0.12; // 字幕は次の文の話し始めより少し前に切り替える
const DRAFT_GAP = 0.35; // 仮音声の文間
const MIN_GAP = 0.25; // これより短い無音は区切り候補にしない
const GAP_RATIO = 1.5; // 採用する最短の文間が、採用しない最長の間の何倍あれば区切りが明確とみなすか
const SHARE_RANGE = [0.5, 2]; // 文の長さ ÷ 文字数の割合 がこの範囲外なら区切りずれを疑う
const SR = 16000; // 無音判定用のサンプルレート
const WINDOW = 0.02; // 音量を測る窓（秒）
const TAKE_EXTS = ["m4a", "wav", "aiff", "mp3", "caf"];

type Span = { start: number; end: number };

const main = async () => {
  const [id, flag] = process.argv.slice(2);
  if (!id) throw new Error("使い方: npm run narrate -- <id> [--draft]");
  const { script } = (await import(`../videos/${id}/script.ts`)) as { script: Script };
  validateScript(script);

  const { take, speech, source } =
    flag === "--draft" ? await synthesize(script) : await splitTake(script);

  const clip = { start: Math.max(0, speech[0].start - HEAD), end: speech.at(-1)!.end + TAIL };
  const at = (t: number) => round(t - clip.start);
  const timing: Timing = {
    source,
    duration: at(clip.end),
    beats: script.beats.map((beat, i) => ({
      text: beat.text,
      start: i === 0 ? 0 : at(speech[i].start - LEAD),
      end: i + 1 < speech.length ? at(speech[i + 1].start - LEAD) : at(clip.end),
    })),
  };

  mkdirSync(path.join("public", "audio", id), { recursive: true });
  await normalize(take, clip, path.join("public", narrationPath(id)));
  writeFileSync(path.join("public", timingPath(id)), `${JSON.stringify(timing, null, 2)}\n`);
  console.log(`${source}: ${timing.duration.toFixed(1)}s\n${table(script, speech)}`);
};

/** 1文ずつ say で読み上げ、DRAFT_GAP の無音を挟んでつなぐ */
const synthesize = async (script: Script) => {
  const work = mkdtempSync(path.join(tmpdir(), `narrate-${script.id}-`));
  const gap = path.join(work, "gap.wav");
  await ffmpeg(["-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", String(DRAFT_GAP), gap]);

  const files: string[] = [];
  const speech: Span[] = [];
  let t = 0;
  for (const [i, beat] of script.beats.entries()) {
    const aiff = path.join(work, `${i}.aiff`);
    const wav = path.join(work, `${i}.wav`);
    await exec("say", ["-v", "Kyoko", "-o", aiff, plainText(beat.text)]);
    await ffmpeg(["-i", aiff, "-ar", "48000", "-ac", "1", wav]);
    const d = await duration(wav);
    speech.push({ start: t, end: t + d });
    t += d + DRAFT_GAP;
    files.push(wav, gap);
  }

  const list = path.join(work, "list.txt");
  writeFileSync(list, files.slice(0, -1).map((f) => `file '${f}'`).join("\n"));
  const take = path.join(work, "take.wav");
  await ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", take]);
  return { take, speech, source: "draft" as const };
};

/** 録音テイクを文ごとの発話区間に分ける */
const splitTake = async (script: Script) => {
  const dir = path.join("videos", script.id);
  const take = TAKE_EXTS.map((ext) => path.join(dir, `take.${ext}`)).find(existsSync);
  if (!take) {
    throw new Error(`${dir}/take.(${TAKE_EXTS.join("|")}) がありません。全文を1テイクで録音して置いてください`);
  }
  const n = script.beats.length;
  const { gaps, speechStart, speechEnd } = await findGaps(take);
  const gapList = gaps.map((g) => `  ${g.start.toFixed(2)}-${g.end.toFixed(2)} (${len(g).toFixed(2)}s)`).join("\n");

  // 文と文の境目（前の文の話し終わり〜次の文の話し始め）
  let bounds: Span[];
  const manual = path.join(dir, "boundaries.json");
  if (existsSync(manual)) {
    const starts: number[] = JSON.parse(readFileSync(manual, "utf8"));
    if (starts.length !== n - 1 || starts.some((s, i) => s <= (starts[i - 1] ?? speechStart))) {
      throw new Error(`${manual} には2文目以降の話し始め（秒）を昇順で ${n - 1} 個書いてください`);
    }
    // 無音区間は分からないので、次の文の話し始めまでを前の文とする
    bounds = starts.map((s) => ({ start: s, end: s }));
  } else {
    const ranked = [...gaps].sort((a, b) => len(b) - len(a));
    if (ranked.length < n - 1) {
      throw new Error(`文間の無音が ${ranked.length} 個しか見つかりません（必要 ${n - 1}）。文の間を1秒ほどあけて録り直すか、${manual} で指定してください\n${gapList}`);
    }
    const weakest = ranked[n - 2];
    const unused = ranked[n - 1];
    if (weakest && unused && len(weakest) < len(unused) * GAP_RATIO) {
      throw new Error(`文間と文中の間の区別がつきません（採用する最短 ${len(weakest).toFixed(2)}s / 採用しない最長 ${len(unused).toFixed(2)}s）。文の間を長めにあけて録り直すか、${manual} で指定してください\n${gapList}`);
    }
    bounds = ranked.slice(0, n - 1).sort((a, b) => a.start - b.start);
  }

  const speech: Span[] = script.beats.map((_, i) => ({
    start: i === 0 ? speechStart : bounds[i - 1].end,
    end: i === n - 1 ? speechEnd : bounds[i].start,
  }));

  const shares = shareRatios(script, speech);
  if (shares.some((r) => r < SHARE_RANGE[0] || r > SHARE_RANGE[1])) {
    throw new Error(`文の長さが文字数の割合と合いません。区切りがずれている可能性があります（言い直しがあれば録り直すか、${manual} で指定）\n${table(script, speech)}\n候補の無音:\n${gapList}`);
  }
  return { take, speech, source: "take" as const };
};

/**
 * 20ms ごとの音量から無音区間を探す。正規化すると間が持ち上がって判定が崩れるので、
 * 必ず生のテイクで測る。しきい値はテイクごとのノイズフロア + 10dB
 */
const findGaps = async (file: string) => {
  const { stdout } = await exec(
    "ffmpeg",
    ["-v", "error", "-i", file, "-af", "highpass=f=80", "-ac", "1", "-ar", String(SR), "-f", "s16le", "-"],
    { encoding: "buffer", maxBuffer: 1 << 30 },
  );
  const pcm = new Int16Array(new Uint8Array(stdout).buffer);
  const hop = Math.round(SR * WINDOW);
  const db: number[] = [];
  for (let i = 0; i + hop <= pcm.length; i += hop) {
    let sum = 0;
    for (let j = i; j < i + hop; j++) sum += pcm[j] * pcm[j];
    db.push(10 * Math.log10(sum / hop / 32768 ** 2 + 1e-10));
  }

  const sorted = [...db].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)];
  const peak = sorted[Math.floor(sorted.length * 0.99)];
  if (peak - floor < 20) {
    throw new Error(`声とノイズの差が ${(peak - floor).toFixed(0)}dB しかありません。静かな場所で録り直してください`);
  }
  const quiet = db.map((v) => v < floor + 10);
  // クリック程度の短い音（60ms 以下）で無音が分断されないようにする
  for (let k = 0; k < quiet.length; ) {
    if (quiet[k]) { k++; continue; }
    let e = k;
    while (e < quiet.length && !quiet[e]) e++;
    if (k > 0 && e < quiet.length && e - k <= 3) quiet.fill(true, k, e);
    k = e;
  }

  const silent: Span[] = [];
  let from = -1;
  quiet.forEach((q, k) => {
    if (q && from < 0) from = k;
    if (!q && from >= 0) {
      silent.push({ start: from * WINDOW, end: k * WINDOW });
      from = -1;
    }
  });
  if (from >= 0) silent.push({ start: from * WINDOW, end: quiet.length * WINDOW });

  const total = quiet.length * WINDOW;
  const leading = silent[0]?.start === 0 ? silent.shift() : undefined;
  const trailing = silent.at(-1)?.end === total ? silent.pop() : undefined;
  return {
    speechStart: leading?.end ?? 0,
    speechEnd: trailing?.start ?? total,
    gaps: silent.filter((s) => len(s) >= MIN_GAP),
  };
};

/** 各文の長さの割合 ÷ 文字数の割合。1 に近いほど自然 */
const shareRatios = (script: Script, speech: Span[]) => {
  const chars = script.beats.map((b) => [...plainText(b.text)].length);
  const totalChars = chars.reduce((a, b) => a + b, 0);
  const totalDur = speech.reduce((a, s) => a + len(s), 0);
  return speech.map((s, i) => len(s) / totalDur / (chars[i] / totalChars));
};

/**
 * clip を切り出し、2パスの loudnorm（linear）で -14 LUFS / -1.5 dBTP にそろえる。
 * 動画の音声はステレオになり、モノラルのまま測ると書き出し後に約 3dB 大きくなるので、ステレオにしてから測る
 */
const normalize = async (take: string, clip: Span, out: string) => {
  const chain = `highpass=f=80,aformat=channel_layouts=mono,atrim=start=${clip.start.toFixed(3)}:end=${clip.end.toFixed(3)},asetpts=PTS-STARTPTS,apad=whole_dur=${len(clip).toFixed(3)},pan=stereo|c0=c0|c1=c0`;
  const target = "I=-14:TP=-1.5:LRA=11";
  const { stderr } = await exec("ffmpeg", ["-hide_banner", "-nostats", "-i", take, "-af", `${chain},loudnorm=${target}:print_format=json`, "-f", "null", "-"]);
  const json = stderr.slice(stderr.lastIndexOf("{"));
  const m = JSON.parse(json.slice(0, json.indexOf("}") + 1));
  const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}`;
  // loudnorm は内部で 192kHz にするので出力レートを明示する
  await ffmpeg(["-i", take, "-af", `${chain},loudnorm=${target}:${measured}:linear=true`, "-ar", "48000", "-ac", "2", out]);
};

const table = (script: Script, speech: Span[]) => {
  const shares = shareRatios(script, speech);
  return speech
    .map((s, i) => `${String(i).padStart(3)}  ${s.start.toFixed(2).padStart(6)}s  ${len(s).toFixed(2)}s  x${shares[i].toFixed(2)}  ${plainText(script.beats[i].text).slice(0, 18)}`)
    .join("\n");
};

const ffmpeg = (args: string[]) => exec("ffmpeg", ["-v", "error", "-y", ...args]);

const duration = async (file: string) => {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number.parseFloat(stdout);
};

const len = (s: Span) => s.end - s.start;
const round = (t: number) => Math.round(t * 1000) / 1000;

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
