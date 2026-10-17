import { Audio } from "@remotion/media";
import React, { useContext } from "react";
import { Sequence, staticFile } from "remotion";
import { BeatContext } from "./beat";

/**
 * pop: 要素が出る / tick: 文字・数字が出る / miss: ×・失敗 / done: 正解・完了。
 * 音は pipeline/sfx.ts で合成して public/sfx/<name>.wav に置く
 */
export type SfxName = "pop" | "tick" | "miss" | "done";

/**
 * 拍 at の開始 + delay フレームで効果音を鳴らす。
 * 図の enter(at, { delay }) と同じ値を渡すと、録音を差し替えても動きと音がずれない。
 * <svg> の中には置けないので、Visuals では <svg> の外（Fragment の中）に置く
 */
export const Sfx: React.FC<{ name: SfxName; at: number; delay?: number; volume?: number }> = ({
  name,
  at,
  delay = 0,
  volume = 1,
}) => {
  const starts = useContext(BeatContext);
  return (
    <Sequence from={starts[at] + delay} layout="none" name={`sfx ${name}`}>
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  );
};
