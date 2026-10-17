import React from "react";
import { Easing, interpolate } from "remotion";
import { useBeat } from "./beat";
import { FONT } from "./font";
import type { Beat } from "./script";
import { CAPTION_BOX, color } from "./theme";

/**
 * 今の拍の字幕。`**語**` に蛍光マーカーを左から引く。
 * 文節で折り返すには auto-phrase と lang="ja" の両方が必要（Remotion のページは lang="en"）。
 */
export const Caption: React.FC<{ beats: Beat[] }> = ({ beats }) => {
  const { index, since } = useBeat();
  const t = since(index);
  const first = index === 0;
  const opacity = first
    ? 1
    : interpolate(t, [0, 6], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const sweep = first
    ? 1
    : interpolate(t, [6, 20], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });

  // split("**") の奇数番目が強調部分
  const parts = beats[index].text.split("**");

  return (
    <div
      lang="ja"
      style={{
        position: "absolute",
        ...CAPTION_BOX,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      <p
        style={
          {
            margin: 0,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 54,
            lineHeight: 1.5,
            color: color.ink,
            textAlign: "center",
            whiteSpace: "pre-line",
            wordBreak: "auto-phrase",
          } as React.CSSProperties
        }
      >
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <span
              key={i}
              style={{
                whiteSpace: "nowrap",
                backgroundImage: `linear-gradient(transparent 55%, ${color.marker} 55%, ${color.marker} 92%, transparent 92%)`,
                backgroundRepeat: "no-repeat",
                backgroundSize: `${sweep * 100}% 100%`,
              }}
            >
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </p>
    </div>
  );
};
