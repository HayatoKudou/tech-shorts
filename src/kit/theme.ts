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
 * 字幕と図はこの中に置き、中心は x=480（画面中央より左）になる。
 */
export const SAFE = { top: 260, bottom: 480, left: 72, right: 192 } as const;

type Box = { left: number; top: number; width: number; height: number };

const SAFE_WIDTH = WIDTH - SAFE.left - SAFE.right;

/** 字幕帯（3行まで） */
export const CAPTION_BOX: Box = {
  left: SAFE.left,
  top: SAFE.top,
  width: SAFE_WIDTH,
  height: 260,
};

/** 図を描く領域。Visuals はこの大きさの座標系で描く */
export const STAGE_BOX: Box = {
  left: SAFE.left,
  top: CAPTION_BOX.top + CAPTION_BOX.height + 40,
  width: SAFE_WIDTH,
  height: HEIGHT - SAFE.bottom - (CAPTION_BOX.top + CAPTION_BOX.height + 40),
};
