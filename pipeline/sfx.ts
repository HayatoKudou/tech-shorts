// 効果音を ffmpeg で合成して public/sfx/<name>.wav に書き出す。音色を変えたらここを直して npm run sfx
//
// 方眼ノートに合わせ、電子音より柔らかい木の打楽器・鉛筆寄りの音にしている。
// 音量はファイル側でそろえる（最大モーメンタリラウドネスを TARGET に合わせる）ので、<Sfx> は既定で volume 1 のまま使う。

import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { SfxName } from "../src/kit/Sfx";

const exec = promisify(execFile);

/** ナレーション（-14 LUFS）より 10dB ほど下に聞こえる大きさ */
const TARGET = -24;
const SR = 48000;

// t は秒。立ち上がりのプチッを避けるため、どれも 4ms でフェードインする
const ATTACK = "min(1,t/0.004)";

const SOUNDS: Record<SfxName, { duration: number; expr: string; filter: string }> = {
  // 木琴のような「ポン」: 659Hz（E5）と、速く減衰する 4 倍音
  pop: {
    duration: 0.4,
    expr: `${ATTACK}*(0.8*sin(2*PI*659*t)*exp(-t*14)+0.25*sin(2*PI*2636*t)*exp(-t*45))`,
    filter: "lowpass=f=6000",
  },
  // 鉛筆で軽く叩くような「カチカチ」: 60ms ごとのノイズの粒（8回）
  tick: {
    duration: 0.48,
    expr: `${ATTACK}*(2*random(0)-1)*exp(-mod(t,0.06)*260)*exp(-t*2.5)`,
    filter: "highpass=f=1800,lowpass=f=7000",
  },
  // 低い「ブブッ」: 110Hz の倍音を重ねたこもった音を 2 回
  miss: {
    duration: 0.32,
    expr: `${ATTACK}*(sin(2*PI*110*t)+0.5*sin(2*PI*220*t)+0.33*sin(2*PI*330*t)+0.25*sin(2*PI*440*t))*if(lt(t,0.12),exp(-t*18),exp(-(t-0.12)*14))`,
    filter: "lowpass=f=1400",
  },
  // 上がる 2 音「ポロン」: 880Hz（A5）→ 1319Hz（E6）
  done: {
    duration: 0.75,
    expr: `${ATTACK}*(0.6*sin(2*PI*880*t)*exp(-t*9)+0.6*gte(t,0.1)*sin(2*PI*1319*(t-0.1))*exp(-(t-0.1)*6))`,
    filter: "lowpass=f=8000",
  },
};

const main = async () => {
  const outDir = path.join("public", "sfx");
  mkdirSync(outDir, { recursive: true });
  const work = mkdtempSync(path.join(tmpdir(), "sfx-"));

  for (const [name, { duration, expr, filter }] of Object.entries(SOUNDS)) {
    const raw = path.join(work, `${name}.wav`);
    // 減衰しきる前に切れると末尾でプツッと鳴るので、最後の 60ms でフェードアウトする
    const fade = `afade=t=out:st=${(duration - 0.06).toFixed(2)}:d=0.06`;
    await exec("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `aevalsrc='${expr}':s=${SR}:d=${duration}`, "-af", `${filter},${fade}`, "-ac", "2", raw]);

    // 400ms 窓で測るので、短い音でも測れるよう後ろに無音を足す
    const { stderr } = await exec("ffmpeg", ["-hide_banner", "-nostats", "-i", raw, "-af", "apad=whole_dur=1,ebur128", "-f", "null", "-"]);
    const momentary = [...stderr.matchAll(/M:\s*(-?[\d.]+)/g)].map((m) => Number(m[1]));
    const gain = TARGET - Math.max(...momentary);

    const out = path.join(outDir, `${name}.wav`);
    await exec("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af", `volume=${gain.toFixed(2)}dB`, "-c:a", "pcm_s16le", out]);
    console.log(`${name}: ${duration}s, ${gain >= 0 ? "+" : ""}${gain.toFixed(1)}dB → ${out}`);
  }
};

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
