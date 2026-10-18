export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** 方眼ノート: 生成りの紙に黒インク、強調は朱、補助は藍、キーワードは蛍光マーカー */
export const color = {
  paper: "#F6F2E9",
  dot: "#D6CEBD",
  ink: "#1F2328",
  muted: "#7A7368",
  accent: "#E2462C",
  sub: "#2F5597",
  marker: "rgba(255, 216, 40, 0.8)",
} as const;

/**
 * 3媒体の UI（上部タブ、下部の説明文、右下のボタン列）に隠れない領域。
 * 通常投稿の公式値は無いため、広告テンプレートの値のうち最も厳しいものを採った近似。
 * 字幕と図は x=540（画面中央）を中心に置く。
 */
export const SAFE = { top: 260, bottom: 480, left: 72, right: 192 } as const;

type Box = { left: number; top: number; width: number; height: number };

/** 54px で全角15字が入る幅 */
const CAPTION_WIDTH = WIDTH - SAFE.left - SAFE.right;

/** 字幕帯（3行まで）。右のボタン列は画面の下半分なので、幅はそのまま中央に置く */
export const CAPTION_BOX: Box = {
  left: (WIDTH - CAPTION_WIDTH) / 2,
  top: SAFE.top,
  width: CAPTION_WIDTH,
  height: 260,
};

/** 図を描く領域。Visuals はこの大きさの座標系で描く。右のボタン列を避けつつ中央にそろえるため、左右とも SAFE.right あける */
export const STAGE_BOX: Box = {
  left: SAFE.right,
  top: CAPTION_BOX.top + CAPTION_BOX.height + 40,
  width: WIDTH - SAFE.right * 2,
  height: HEIGHT - SAFE.bottom - (CAPTION_BOX.top + CAPTION_BOX.height + 40),
};
