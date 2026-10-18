import React from "react";
import { random } from "remotion";
import { draw, useBeat } from "../../src/kit/beat";
import { FONT } from "../../src/kit/font";
import { Sfx } from "../../src/kit/Sfx";
import { color, STAGE_BOX } from "../../src/kit/theme";

// バージョン1 の QR は 21×21 モジュール
const N = 21;
const CELL = 26;
const SIZE = N * CELL;
const X0 = (STAGE_BOX.width - SIZE) / 2;
const Y0 = 20;

/** 角の位置検出パターン（区切りの白1列を含む 9×9）なら黒か白か。それ以外は null */
const finder = (x: number, y: number): boolean | null => {
  for (const [ox, oy] of [
    [0, 0],
    [N - 7, 0],
    [0, N - 7],
  ]) {
    const dx = x - ox;
    const dy = y - oy;
    if (dx < -1 || dx > 7 || dy < -1 || dy > 7) continue;
    if (dx < 0 || dx > 6 || dy < 0 || dy > 6) return false;
    // 外周と中央 3×3 が黒、その間の1周が白
    return Math.max(Math.abs(dx - 3), Math.abs(dy - 3)) !== 2;
  }
  return null;
};

// 見た目だけの模様で、読み取れる QR ではない。random() はシード固定なので毎フレーム同じ
const modules = Array.from({ length: N * N }, (_, k) => ({
  x: k % N,
  y: Math.floor(k / N),
  on: finder(k % N, Math.floor(k / N)) ?? random(`qr-${k}`) > 0.5,
})).filter((m) => m.on);

const CHIP_Y = Y0 + SIZE + 60;
const CHIP_W = 260;
// 2つのチップの間（「＋」を置く幅）
const CHIP_GAP = 60;
const CHIP_H = 84;

const Chip: React.FC<{ x: number; label: string; tint: string; p: number }> = ({
  x,
  label,
  tint,
  p,
}) => (
  <g>
    <rect
      x={x}
      y={CHIP_Y}
      width={CHIP_W}
      height={CHIP_H}
      rx={14}
      fill="none"
      stroke={tint}
      strokeWidth={5}
      {...draw(p)}
    />
    <text
      x={x + CHIP_W / 2}
      y={CHIP_Y + CHIP_H / 2}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily={FONT}
      fontWeight={700}
      fontSize={42}
      fill={tint}
      opacity={p}
    >
      {label}
    </text>
  </g>
);

// 汚れ: 右下（位置検出パターンの無い角）を覆う円に近い形。面積は QR の3割ほど
const STAIN = { cx: X0 + SIZE * 0.68, cy: Y0 + SIZE * 0.66, r: SIZE * 0.3 };
const stainPath = (() => {
  const points = Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    const r = STAIN.r * (0.88 + 0.24 * random(`stain-${i}`));
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  // 隣り合う点の中点を通る二次ベジェでなめらかに閉じる
  const mid = (i: number) => {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    return `${(x1 + x2) / 2} ${(y1 + y2) / 2}`;
  };
  const curves = points.map(([x, y], i) => `Q ${x} ${y} ${mid(i)}`).join(" ");
  return `M ${mid(points.length - 1)} ${curves} Z`;
})();

// 「元に戻せる」のチェック。QR の右上の余白に描く
const CHECK = { x: X0 + SIZE + 10, y: Y0 + 30, s: 0.65 };

export const Visuals: React.FC = () => {
  const { enter } = useBeat();
  const data = enter(1);
  const correction = enter(1, { delay: 8 });
  const stain = enter(2, { frames: 12 });
  const label = enter(2, { delay: 10, frames: 10 });
  const check = enter(2, { delay: 28, frames: 12 });

  return (
    <>
      <Sfx name="pop" at={1} />
      <Sfx name="pop" at={1} delay={8} />
      <Sfx name="miss" at={2} />
      <Sfx name="tick" at={2} delay={10} />
      <Sfx name="done" at={2} delay={28} />
      <svg width={STAGE_BOX.width} height={STAGE_BOX.height}>
        <g shapeRendering="crispEdges" fill={color.ink}>
          {modules.map((m) => (
            <rect key={`${m.x}-${m.y}`} x={X0 + m.x * CELL} y={Y0 + m.y * CELL} width={CELL} height={CELL} />
          ))}
        </g>
  
        <Chip x={(STAGE_BOX.width - CHIP_GAP) / 2 - CHIP_W} label="データ" tint={color.ink} p={data} />
        <text
          x={STAGE_BOX.width / 2}
          y={CHIP_Y + CHIP_H / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={FONT}
          fontWeight={700}
          fontSize={56}
          fill={color.muted}
          opacity={correction}
        >
          ＋
        </text>
        <Chip x={(STAGE_BOX.width + CHIP_GAP) / 2} label="誤り訂正" tint={color.sub} p={correction} />
  
        <g transform={`translate(${STAIN.cx} ${STAIN.cy}) scale(${stain})`}>
          <path d={stainPath} fill={color.accent} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily={FONT}
            fontWeight={700}
            fontSize={72}
            fill={color.paper}
            opacity={label}
          >
            約30%
          </text>
        </g>
  
        <path
          d={`M ${CHECK.x} ${CHECK.y + 50 * CHECK.s} L ${CHECK.x + 35 * CHECK.s} ${CHECK.y + 85 * CHECK.s} L ${CHECK.x + 95 * CHECK.s} ${CHECK.y}`}
          fill="none"
          stroke={color.sub}
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...draw(check)}
        />
      </svg>
    </>
  );
};
