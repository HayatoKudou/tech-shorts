import type { Script } from "./script";

/**
 * pipeline/narrate.ts が書き出すナレーションの区切り。
 * 秒単位で narration.wav の先頭が 0。text は録音時点の台本で、台本の書き換え検知に使う。
 */
export type Timing = {
  source: "take" | "draft";
  duration: number;
  beats: { text: string; start: number; end: number }[];
};

/** public/ からの相対パス */
export const narrationPath = (id: string) => `audio/${id}/narration.wav`;
export const timingPath = (id: string) => `audio/${id}/timing.json`;

export const assertTimingMatches = (script: Script, timing: Timing): void => {
  if (timing.beats.length !== script.beats.length) {
    throw new Error(
      `timing.json の拍数 (${timing.beats.length}) が台本 (${script.beats.length}) と違います。npm run narrate -- ${script.id} を再実行してください`,
    );
  }
  script.beats.forEach((beat, i) => {
    if (timing.beats[i].text !== beat.text) {
      throw new Error(
        `beat ${i} の台本が録音後に変わっています。読みが変わるなら録り直し、表記だけなら npm run narrate -- ${script.id} を再実行してください\n録音時: ${timing.beats[i].text}\n現在: ${beat.text}`,
      );
    }
  });
};
