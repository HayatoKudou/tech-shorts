// npm run render -- <id>
// Remotion で書き出したあと、音声だけにリミッターをかけて out/<id>.mp4 にする（映像は再エンコードしない）。
// ナレーション・BGM・効果音のピークが偶然重なると 0dBFS を超えることがあるため。

import { execFile, spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** サンプルピークの上限（-2 dBFS）。投稿先の再エンコードで少し上がる分の余裕を見ている */
const LIMIT = 0.79;

const main = async () => {
  const [id, ...rest] = process.argv.slice(2);
  if (!id) throw new Error("使い方: npm run render -- <id> [remotion render のオプション]");

  const raw = path.join(mkdtempSync(path.join(tmpdir(), `render-${id}-`)), `${id}.mp4`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(path.join("node_modules", ".bin", "remotion"), ["render", "src/index.ts", id, raw, ...rest], {
      stdio: "inherit",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`remotion render が失敗しました (${code})`))));
  });

  const out = path.join("out", `${id}.mp4`);
  await exec("ffmpeg", [
    "-v", "error", "-y", "-i", raw,
    "-c:v", "copy",
    "-af", `alimiter=limit=${LIMIT}:level=false:latency=true`,
    "-c:a", "aac", "-b:a", "256k",
    "-movflags", "+faststart",
    out,
  ]);

  const { stderr } = await exec("ffmpeg", ["-hide_banner", "-nostats", "-i", out, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]);
  // 途中経過の行にも I: が出るので、最後のまとめ（Summary）から読む
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  const integrated = summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1];
  const peak = summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1];
  console.log(`${out}: ${integrated} LUFS, true peak ${peak} dBFS`);
};

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
