import { createContext, useContext } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

/** 各拍の開始フレーム。Video が timing から計算して配る */
export const BeatContext = createContext<number[]>([0]);

/**
 * 今が何拍目か、各拍から何フレーム経ったかを返す。
 * 図は「拍 i で現れて、その後も残る」を enter(i) で書く。秒数は直接書かない
 * （仮音声から本番の録音に差し替えても図のコードを触らずに済むように）。
 */
export const useBeat = () => {
  const frame = useCurrentFrame();
  const starts = useContext(BeatContext);

  let index = 0;
  while (index + 1 < starts.length && frame >= starts[index + 1]) index++;

  /** 拍 i が始まってからのフレーム数（始まる前は負） */
  const since = (i: number) => frame - starts[i];

  /**
   * 拍 i の開始 + delay から frames かけて 0→1。
   * 拍 0 の delay なしは常に 1（先頭フレームがサムネイルに使われるため、最初から描き終えておく）
   */
  const enter = (i: number, { delay = 0, frames = 15 } = {}) =>
    i === 0 && delay === 0
      ? 1
      : interpolate(since(i), [delay, delay + frames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.cubic),
        });

  return { index, since, enter };
};

/** SVG の線をペンで描くように出す。p = 0→1 */
export const draw = (p: number) => ({
  pathLength: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1 - p,
  opacity: p > 0 ? 1 : 0,
});
