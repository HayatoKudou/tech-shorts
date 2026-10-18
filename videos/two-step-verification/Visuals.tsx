import React from "react";
import { random } from "remotion";
import { draw, useBeat } from "../../src/kit/beat";
import { FONT } from "../../src/kit/font";
import { Sfx } from "../../src/kit/Sfx";
import { color, STAGE_BOX } from "../../src/kit/theme";

const W = STAGE_BOX.width;

// 数値は RFC 6238 付録 B のテストベクトル（SHA1, UNIX時間 2000000000）。鍵は ASCII の "12345678901234567890"
const SECRET = "GEZDGNBVGY3TQOJQ…";
const COUNTER = "66666666";
const HMAC = "25a326d31fc366244cad054976020c7b56b13d5f";
// 最終バイトの下位4ビット = 15 なので、15〜18バイト目（16進の30〜37文字目）を取り出す
const HMAC_PICK: [number, number] = [30, 38];
const TRUNCATED = "2069279037";
const OTP = "279 037";
const SMS_CODE = "482913";

const PHONE = { w: 200, h: 340 };

type Anchor = "start" | "middle" | "end";

const Label: React.FC<{
  x: number;
  y: number;
  size: number;
  fill?: string;
  anchor?: Anchor;
  opacity?: number;
  children: React.ReactNode;
}> = ({ x, y, size, fill = color.ink, anchor = "middle", opacity = 1, children }) => (
  <text
    x={x}
    y={y}
    textAnchor={anchor}
    dominantBaseline="central"
    fontFamily={FONT}
    fontWeight={700}
    fontSize={size}
    fill={fill}
    opacity={opacity}
  >
    {children}
  </text>
);

/** 字幕と同じ蛍光マーカー。p で左から引く */
const Marker: React.FC<{ x: number; y: number; width: number; size: number; p: number }> = ({
  x,
  y,
  width,
  size,
  p,
}) => <rect x={x} y={y - size * 0.05} width={width * p} height={size * 0.5} fill={color.marker} />;

/** 1文字ずつ等間隔に置く。桁を指し示せるように mark の範囲 [始, 終) にマーカーを引く */
const Digits: React.FC<{
  text: string;
  x: number;
  y: number;
  size: number;
  pitch: number;
  fill?: string;
  opacity?: number;
  mark?: [number, number];
  markP?: number;
}> = ({ text, x, y, size, pitch, fill = color.ink, opacity = 1, mark, markP = 1 }) => (
  <g opacity={opacity}>
    {mark ? (
      <Marker x={x + mark[0] * pitch} y={y} width={(mark[1] - mark[0]) * pitch} size={size} p={markP} />
    ) : null}
    {[...text].map((ch, i) => (
      <Label key={i} x={x + (i + 0.5) * pitch} y={y} size={size} fill={fill}>
        {ch}
      </Label>
    ))}
  </g>
);

const Box: React.FC<{ x: number; y: number; w: number; h: number; p: number; tint?: string }> = ({
  x,
  y,
  w,
  h,
  p,
  tint = color.ink,
}) => (
  <rect x={x} y={y} width={w} height={h} rx={16} fill="none" stroke={tint} strokeWidth={5} {...draw(p)} />
);

const Phone: React.FC<{
  x: number;
  y: number;
  p: number;
  w?: number;
  h?: number;
  tint?: string;
  children?: React.ReactNode;
}> = ({ x, y, p, w = PHONE.w, h = PHONE.h, tint = color.ink, children }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={28} fill="none" stroke={tint} strokeWidth={6} {...draw(p)} />
    <path
      d={`M ${x + w / 2 - 28} ${y + 24} L ${x + w / 2 + 28} ${y + 24}`}
      stroke={tint}
      strokeWidth={6}
      strokeLinecap="round"
      {...draw(p)}
    />
    <g opacity={p}>{children}</g>
  </g>
);

/** SMS の吹き出し。(cx, cy) が中心 */
const Bubble: React.FC<{ cx: number; cy: number; text: string; tint: string; size?: number }> = ({
  cx,
  cy,
  text,
  tint,
  size = 36,
}) => {
  const pitch = size * 0.64;
  const w = text.length * pitch + 36;
  return (
    <g>
      <rect x={cx - w / 2} y={cy - size * 0.95} width={w} height={size * 1.9} rx={20} fill="none" stroke={tint} strokeWidth={4} />
      <Digits text={text} x={cx - (text.length * pitch) / 2} y={cy} size={size} pitch={pitch} fill={tint} />
    </g>
  );
};

const Arrow: React.FC<{ from: [number, number]; to: [number, number]; p: number; tint?: string }> = ({
  from,
  to,
  p,
  tint = color.ink,
}) => {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const wing = (s: number) => `${x2 - 24 * Math.cos(a + s)} ${y2 - 24 * Math.sin(a + s)}`;
  return (
    <g stroke={tint} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M ${x1} ${y1} L ${x2} ${y2}`} {...draw(p)} />
      <path d={`M ${wing(0.5)} L ${x2} ${y2} L ${wing(-0.5)}`} opacity={Math.max(0, (p - 0.85) / 0.15)} />
    </g>
  );
};

/** 鍵。(x, y) が持ち手の輪の中心 */
const KeyIcon: React.FC<{ x: number; y: number; p: number; s?: number; tint?: string }> = ({
  x,
  y,
  p,
  s = 1,
  tint = color.ink,
}) => (
  <g stroke={tint} strokeWidth={6 * Math.min(1, s + 0.2)} strokeLinecap="round" fill="none">
    <circle cx={x} cy={y} r={18 * s} {...draw(p)} />
    <path
      d={`M ${x + 18 * s} ${y} L ${x + 70 * s} ${y} M ${x + 52 * s} ${y} L ${x + 52 * s} ${y + 16 * s} M ${x + 66 * s} ${y} L ${x + 66 * s} ${y + 12 * s}`}
      {...draw(p)}
    />
  </g>
);

const ClockIcon: React.FC<{ x: number; y: number; r: number; p: number }> = ({ x, y, r, p }) => (
  <g stroke={color.ink} strokeWidth={5} strokeLinecap="round" fill="none">
    <circle cx={x} cy={y} r={r} {...draw(p)} />
    <path d={`M ${x} ${y - r * 0.6} L ${x} ${y} L ${x + r * 0.45} ${y + r * 0.3}`} {...draw(p)} />
  </g>
);

/** 人。(x, y) が頭の中心 */
const Person: React.FC<{ x: number; y: number; p: number; tint?: string }> = ({ x, y, p, tint = color.ink }) => (
  <g stroke={tint} strokeWidth={6} strokeLinecap="round" fill="none">
    <circle cx={x} cy={y} r={26} {...draw(p)} />
    <path d={`M ${x - 50} ${y + 96} Q ${x - 50} ${y + 40} ${x} ${y + 40} Q ${x + 50} ${y + 40} ${x + 50} ${y + 96}`} {...draw(p)} />
  </g>
);

/** パスワード欄の伏せ字 */
const Dots: React.FC<{ x: number; y: number; n: number; gap: number; r: number }> = ({ x, y, n, gap, r }) => (
  <g fill={color.ink}>
    {Array.from({ length: n }, (_, i) => (
      <circle key={i} cx={x + i * gap} cy={y} r={r} />
    ))}
  </g>
);

// 見た目だけの模様で、読み取れる QR ではない
const QR_GRID = 9;
const qrCells = Array.from({ length: QR_GRID * QR_GRID }, (_, k) => ({ i: k % QR_GRID, j: Math.floor(k / QR_GRID) }))
  .filter(({ i, j }) => !((i < 3 || i > 5) && j < 3) && !(i < 3 && j > 5))
  .filter(({ i, j }) => random(`2fa-qr-${i}-${j}`) > 0.55);

const QrIcon: React.FC<{ x: number; y: number; size: number; p: number }> = ({ x, y, size, p }) => {
  const c = size / QR_GRID;
  const finders: [number, number][] = [
    [0, 0],
    [6, 0],
    [0, 6],
  ];
  return (
    <g opacity={p}>
      {finders.map(([i, j]) => (
        <g key={`${i}-${j}`}>
          <rect x={x + i * c + 2} y={y + j * c + 2} width={3 * c - 4} height={3 * c - 4} fill="none" stroke={color.ink} strokeWidth={4} />
          <rect x={x + (i + 1) * c} y={y + (j + 1) * c} width={c} height={c} fill={color.ink} />
        </g>
      ))}
      {qrCells.map(({ i, j }) => (
        <rect key={`${i}-${j}`} x={x + i * c} y={y + j * c} width={c} height={c} fill={color.ink} />
      ))}
    </g>
  );
};

const Check: React.FC<{ x: number; y: number; p: number; s?: number }> = ({ x, y, p, s = 1 }) => (
  <path
    d={`M ${x - 30 * s} ${y} L ${x - 8 * s} ${y + 22 * s} L ${x + 32 * s} ${y - 22 * s}`}
    fill="none"
    stroke={color.sub}
    strokeWidth={10}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...draw(p)}
  />
);

const Cross: React.FC<{ x: number; y: number; p: number; r?: number }> = ({ x, y, p, r = 34 }) => (
  <g stroke={color.accent} strokeWidth={10} strokeLinecap="round">
    <path d={`M ${x - r} ${y - r} L ${x + r} ${y + r}`} {...draw(Math.min(1, p * 2))} />
    <path d={`M ${x + r} ${y - r} L ${x - r} ${y + r}`} {...draw(Math.max(0, p * 2 - 1))} />
  </g>
);


// 場面ごとに図のまとまりが領域（幅 696 × 高さ 880）の上下中央に来るように置く
const CX = W / 2;

/** 拍0（サムネイル）: 届く6桁と作る6桁 */
const Intro: React.FC = () => {
  const { enter } = useBeat();
  const columns = [
    { cx: W / 4, title: "届く", label: "SMS・メール" },
    { cx: (W * 3) / 4, title: "作る", label: "認証アプリ" },
  ];
  return (
    <g opacity={1 - enter(1, { frames: 10 })}>
      {columns.map(({ cx, title, label }, k) => (
        <g key={title}>
          <Label x={cx} y={180} size={72}>
            {title}
          </Label>
          <Phone x={cx - 110} y={250} w={220} h={380} p={1}>
            {k === 0 ? (
              <Bubble cx={cx} cy={410} text={SMS_CODE} tint={color.sub} />
            ) : (
              <>
                <Digits text={OTP} x={cx - 84} y={410} size={44} pitch={24} />
                <circle cx={cx} cy={510} r={24} fill="none" stroke={color.sub} strokeWidth={6} strokeDasharray="105 200" />
              </>
            )}
          </Phone>
          <Label x={cx} y={700} size={44} fill={color.sub}>
            {label}
          </Label>
        </g>
      ))}
    </g>
  );
};

const SERVER_A = { x: 20, y: 60, w: 220, h: 140 };
const MEMO = { x: 300, y: 60, w: 376, h: 140 };
const INPUT = { x: 330, y: 300, w: 346, h: 130 };
const PHONE_A = { x: 30, y: 480 };
const THIEF = { x: 476, y: 480 };

/** 拍1〜4: SMS・メールで届く6桁 */
const Delivered: React.FC = () => {
  const { enter } = useBeat();
  const server = enter(1);
  const code = enter(1, { delay: 10 });
  const phone = enter(1, { delay: 40 });
  const send = enter(1, { delay: 44 });
  const arrive = enter(1, { delay: 72 });
  const memo = enter(2);
  const input = enter(2, { delay: 60 }) * (1 - enter(4));
  const match = enter(2, { delay: 90 }) * (1 - enter(4));
  const receive = enter(3);
  const thief = enter(4, { delay: 20 });
  const hijack = enter(4, { delay: 40 });
  const stolen = enter(4, { delay: 80 });
  const codePitch = 40;
  const lane = SERVER_A.x + SERVER_A.w / 2;

  return (
    <g opacity={enter(1, { frames: 10 }) * (1 - enter(5, { frames: 10 }))}>
      <Box {...SERVER_A} p={server} />
      <Label x={lane} y={SERVER_A.y + SERVER_A.h / 2} size={42} opacity={server}>
        サーバー
      </Label>

      <Box {...MEMO} p={memo} />
      <Digits
        text={SMS_CODE}
        x={MEMO.x + (MEMO.w - SMS_CODE.length * codePitch) / 2}
        y={MEMO.y + 58}
        size={64}
        pitch={codePitch}
        opacity={code}
      />
      <Label x={MEMO.x + MEMO.w / 2} y={MEMO.y + 114} size={28} fill={color.muted} opacity={code * (1 - memo)}>
        使い捨ての乱数
      </Label>
      <Label x={MEMO.x + MEMO.w / 2} y={MEMO.y + 114} size={26} fill={color.muted} opacity={memo}>
        控え（10分以内・1回限り）
      </Label>

      <Arrow from={[lane, SERVER_A.y + SERVER_A.h + 8]} to={[lane, PHONE_A.y - 10]} p={send} tint={color.sub} />
      <Label x={lane + 20} y={330} size={26} fill={color.sub} anchor="start" opacity={send}>
        SMS / メール
      </Label>
      <Phone x={PHONE_A.x} y={PHONE_A.y} p={phone}>
        <g opacity={arrive * (1 - stolen)}>
          <Bubble cx={PHONE_A.x + PHONE.w / 2} cy={PHONE_A.y + 150} text={SMS_CODE} tint={color.sub} size={32} />
        </g>
      </Phone>

      <Arrow from={[PHONE_A.x + PHONE.w + 6, PHONE_A.y + 20]} to={[INPUT.x, INPUT.y + INPUT.h - 10]} p={input} />
      <g opacity={input}>
        <Box {...INPUT} p={1} />
        <Label x={INPUT.x + 24} y={INPUT.y + 34} size={26} fill={color.muted} anchor="start">
          入力
        </Label>
        <Digits text={SMS_CODE} x={INPUT.x + (INPUT.w - 6 * 36) / 2} y={INPUT.y + 76} size={56} pitch={36} />
      </g>
      <Check x={INPUT.x + 120} y={250} p={match} s={0.8} />
      <Label x={INPUT.x + 164} y={250} size={30} fill={color.sub} anchor="start" opacity={match}>
        一致
      </Label>

      <g opacity={receive}>
        <Label x={250} y={640} size={40} anchor="start">
          受け取れる
        </Label>
        <Label x={250} y={704} size={40} anchor="start">
          ＝ 本人
        </Label>
      </g>

      <Cross x={lane} y={400} p={stolen} r={26} />
      <Arrow from={[SERVER_A.x + SERVER_A.w, SERVER_A.y + SERVER_A.h - 20]} to={[THIEF.x + 84, THIEF.y - 10]} p={hijack} tint={color.accent} />
      <Phone x={THIEF.x} y={THIEF.y} p={thief} tint={color.accent}>
        <g opacity={stolen}>
          <Bubble cx={THIEF.x + PHONE.w / 2} cy={THIEF.y + 150} text={SMS_CODE} tint={color.accent} size={32} />
        </g>
      </Phone>
      <Label x={THIEF.x + PHONE.w / 2} y={THIEF.y + PHONE.h + 34} size={34} fill={color.accent} opacity={thief}>
        犯人
      </Label>
    </g>
  );
};

const KEY_CARD = { x: 4, y: 20, w: 328, h: 180 };
const NUM_CARD = { x: 364, y: 20, w: 328, h: 180 };
const HASH = { x: 188, y: 252, w: 320, h: 72 };
const HEX = { x: 28, y: 390, size: 24, pitch: 16 };
const LONG = { x: 168, y: 472, size: 58, pitch: 36 };
const PHONE_B = { x: 20, y: 520 };
const SERVER_B = { x: 476, y: 600, w: 200, h: 160 };

/** 拍5〜10: 認証アプリが作る6桁 */
const Computed: React.FC = () => {
  const { enter } = useBeat();
  const phone = enter(5);
  const offline = enter(5, { delay: 10 }) * (1 - enter(8));
  const keyCard = enter(6);
  const numCard = enter(7);
  const counter = enter(7, { delay: 10 });
  const feed = enter(8);
  const hash = enter(8, { delay: 6 });
  const hex = enter(8, { delay: 18 });
  const pick = enter(8, { delay: 26 });
  const truncate = enter(8, { delay: 34 });
  const long = enter(8, { delay: 42 });
  const lower = enter(8, { delay: 80, frames: 14 });
  const toPhone = enter(8, { delay: 88 });
  const shown = enter(8, { delay: 100 });
  const server = enter(9);
  const serverCode = enter(9, { delay: 50 });
  const match = enter(9, { delay: 80 });
  const known = enter(10);
  const noKey = enter(10, { delay: 60 });
  // 鍵が無い場合を見せる間は、鍵から先の結果を薄くして「？」に置き換える
  const unknown = enter(10, { delay: 72 });
  const result = 1 - 0.8 * unknown;
  const phoneCx = PHONE_B.x + PHONE.w / 2;

  return (
    <g opacity={enter(5, { frames: 10 }) * (1 - enter(11, { frames: 10 }))}>
      <Phone x={PHONE_B.x} y={PHONE_B.y} p={phone}>
        <Digits text={OTP} x={phoneCx - 80} y={PHONE_B.y + 180} size={38} pitch={23} opacity={shown * (1 - unknown)} />
        <Digits text="??? ???" x={phoneCx - 80} y={PHONE_B.y + 180} size={38} pitch={23} fill={color.accent} opacity={unknown} />
        <circle cx={phoneCx} cy={PHONE_B.y + 270} r={22} fill="none" stroke={color.sub} strokeWidth={6} strokeDasharray="100 200" />
        <Label x={phoneCx} y={PHONE_B.y + 314} size={20} fill={color.muted}>
          30秒ごとに変わる
        </Label>
      </Phone>
      <Label x={240} y={590} size={32} fill={color.sub} anchor="start" opacity={offline}>
        通信なし
      </Label>
      <Label x={240} y={630} size={22} fill={color.muted} anchor="start" opacity={offline}>
        （機内モードでも出る）
      </Label>

      <g opacity={1 - 0.7 * noKey}>
        <Box {...KEY_CARD} p={keyCard} />
        <QrIcon x={KEY_CARD.x + 16} y={KEY_CARD.y + 20} size={84} p={keyCard} />
        <KeyIcon x={KEY_CARD.x + 136} y={KEY_CARD.y + 64} p={keyCard} />
        <Label x={KEY_CARD.x + 262} y={KEY_CARD.y + 64} size={52} opacity={keyCard}>
          鍵
        </Label>
        <Label x={KEY_CARD.x + 16} y={KEY_CARD.y + 150} size={20} fill={color.muted} anchor="start" opacity={keyCard}>
          secret={SECRET}
        </Label>
      </g>
      <Cross x={KEY_CARD.x + KEY_CARD.w / 2} y={KEY_CARD.y + KEY_CARD.h / 2} p={noKey} r={50} />

      <Box {...NUM_CARD} p={numCard} />
      <ClockIcon x={NUM_CARD.x + 44} y={NUM_CARD.y + 64} r={30} p={numCard} />
      <Label x={NUM_CARD.x + 90} y={NUM_CARD.y + 64} size={48} anchor="start" opacity={numCard}>
        番号
      </Label>
      <Label x={NUM_CARD.x + NUM_CARD.w - 10} y={NUM_CARD.y + 28} size={22} fill={color.sub} anchor="end" opacity={known}>
        誰でも分かる
      </Label>
      <Label x={NUM_CARD.x + 16} y={NUM_CARD.y + 118} size={20} fill={color.muted} anchor="start" opacity={counter}>
        UNIX時間 2000000000 ÷ 30
      </Label>
      <Label x={NUM_CARD.x + 16} y={NUM_CARD.y + 156} size={34} anchor="start" opacity={counter}>
        = {COUNTER}
      </Label>

      <Arrow from={[KEY_CARD.x + KEY_CARD.w / 2, KEY_CARD.y + KEY_CARD.h + 6]} to={[HASH.x + 102, HASH.y - 6]} p={feed} />
      <Arrow from={[NUM_CARD.x + NUM_CARD.w / 2, NUM_CARD.y + NUM_CARD.h + 6]} to={[HASH.x + HASH.w - 102, HASH.y - 6]} p={feed} />
      <Box {...HASH} p={hash} tint={color.sub} />
      <Label x={CX} y={HASH.y + HASH.h / 2} size={38} fill={color.sub} opacity={hash}>
        HMAC-SHA1
      </Label>
      <Label x={HASH.x + HASH.w + 12} y={HASH.y + HASH.h / 2} size={22} fill={color.muted} anchor="start" opacity={hash}>
        ハッシュ関数
      </Label>

      <g opacity={result}>
        <Label x={HEX.x} y={HEX.y - 30} size={20} fill={color.muted} anchor="start" opacity={hex}>
          20バイト
        </Label>
        <Digits text={HMAC} x={HEX.x} y={HEX.y} size={HEX.size} pitch={HEX.pitch} fill={color.muted} opacity={hex} mark={HMAC_PICK} markP={pick} />
        <Arrow from={[HEX.x + 34 * HEX.pitch, HEX.y + 20]} to={[LONG.x + 10 * LONG.pitch + 8, LONG.y - 26]} p={truncate} />
        <Label x={HEX.x + 35 * HEX.pitch} y={HEX.y + 48} size={20} fill={color.muted} anchor="start" opacity={truncate}>
          31ビット
        </Label>
        <Digits text={TRUNCATED} x={LONG.x} y={LONG.y} size={LONG.size} pitch={LONG.pitch} opacity={long * (1 - unknown)} mark={[4, 10]} markP={lower} />
        <Arrow from={[LONG.x + 4 * LONG.pitch + 10, LONG.y + 40]} to={[PHONE_B.x + PHONE.w + 6, PHONE_B.y + 150]} p={toPhone} />
        <Label x={410} y={536} size={22} fill={color.muted} anchor="start" opacity={toPhone}>
          10の6乗で割った余り
        </Label>
      </g>
      <Digits text="??????????" x={LONG.x} y={LONG.y} size={LONG.size} pitch={LONG.pitch} fill={color.accent} opacity={unknown} />

      <g opacity={result}>
        <Box {...SERVER_B} p={server} />
        <KeyIcon x={SERVER_B.x + 26} y={SERVER_B.y + 40} p={server} s={0.5} />
        <Label x={SERVER_B.x + 122} y={SERVER_B.y + 40} size={28} opacity={server}>
          サーバー
        </Label>
        <Digits text={OTP} x={SERVER_B.x + SERVER_B.w / 2 - 77} y={SERVER_B.y + 108} size={36} pitch={22} opacity={serverCode} />
        <Label x={CX} y={690} size={64} fill={color.sub} opacity={match}>
          ＝
        </Label>
        <Check x={CX} y={780} p={match} />
        <Label x={240} y={858} size={20} fill={color.muted} anchor="start" opacity={match}>
          前後1つ分のずれまで許す・使用済みは拒否
        </Label>
      </g>
    </g>
  );
};

/** 拍11: それぞれが何の証明か */
const Proof: React.FC = () => {
  const { enter } = useBeat();
  const shown = enter(11);
  const words = enter(11, { delay: 10, frames: 14 });
  const left = W / 4;
  const right = (W * 3) / 4;
  return (
    <g opacity={shown * (1 - enter(12, { frames: 10 }))}>
      <Phone x={left - 90} y={200} w={180} h={300} p={shown}>
        <Bubble cx={left} cy={340} text={SMS_CODE} tint={color.sub} size={28} />
      </Phone>
      <KeyIcon x={right - 52} y={350} p={shown} s={2} />
      {[
        { cx: left, label: "SMS・メール", word: "受け取れる" },
        { cx: right, label: "認証アプリ", word: "鍵を持つ" },
      ].map(({ cx, label, word }) => (
        <g key={word}>
          <Label x={cx} y={570} size={36} fill={color.sub}>
            {label}
          </Label>
          <Label x={cx} y={660} size={60} opacity={words}>
            {word}
          </Label>
        </g>
      ))}
    </g>
  );
};

const PW_CARD = { x: CX - 180, y: 110, w: 360, h: 130 };
const SHEET = { x: 20, y: 340, w: 280, h: 240 };
const SERVICE = { x: 396, y: 340, w: 280, h: 64, step: 88 };
const SERVICES = ["サービスA", "サービスB", "サービスC"];

/** 拍12: パスワードは流出や使い回しで知られる */
const Leaked: React.FC = () => {
  const { enter } = useBeat();
  const card = enter(12);
  const leak = enter(12, { delay: 25 });
  const reuse = enter(12, { delay: 40 });
  const other = enter(12, { delay: 60 });
  return (
    <g opacity={enter(12, { frames: 10 }) * (1 - enter(13, { frames: 10 }))}>
      <Box {...PW_CARD} p={card} />
      <g opacity={card}>
        <Label x={PW_CARD.x + 24} y={PW_CARD.y + 34} size={26} fill={color.muted} anchor="start">
          パスワード
        </Label>
        <Dots x={PW_CARD.x + 62} y={PW_CARD.y + 86} n={8} gap={34} r={10} />
      </g>

      <Arrow from={[PW_CARD.x + 120, PW_CARD.y + PW_CARD.h + 8]} to={[SHEET.x + SHEET.w / 2, SHEET.y - 8]} p={leak} />
      <Box {...SHEET} p={leak} />
      <g stroke={color.muted} strokeWidth={5} strokeLinecap="round" opacity={leak}>
        {[56, 100, 144, 188].map((dy) => (
          <path key={dy} d={`M ${SHEET.x + 30} ${SHEET.y + dy} L ${SHEET.x + SHEET.w - 30} ${SHEET.y + dy}`} />
        ))}
      </g>
      <Label x={SHEET.x + SHEET.w / 2} y={SHEET.y + SHEET.h + 40} size={28} opacity={leak}>
        流出した一覧
      </Label>

      <Arrow from={[PW_CARD.x + PW_CARD.w - 120, PW_CARD.y + PW_CARD.h + 8]} to={[SERVICE.x + SERVICE.w / 2, SERVICE.y - 8]} p={reuse} />
      {SERVICES.map((name, i) => (
        <g key={name}>
          <Box x={SERVICE.x} y={SERVICE.y + i * SERVICE.step} w={SERVICE.w} h={SERVICE.h} p={reuse} />
          <Label x={SERVICE.x + SERVICE.w / 2} y={SERVICE.y + i * SERVICE.step + SERVICE.h / 2} size={26} opacity={reuse}>
            {name}
          </Label>
        </g>
      ))}
      <Label x={SERVICE.x + SERVICE.w / 2} y={SHEET.y + SHEET.h + 40} size={28} opacity={reuse}>
        使い回し
      </Label>

      <Person x={CX} y={700} p={other} tint={color.accent} />
      <Label x={CX} y={840} size={30} fill={color.accent} opacity={other}>
        他人
      </Label>
    </g>
  );
};

const THIEF_C = { x: 130, y: 280 };
const HELD = { x: 456, y: 200 };

/** 拍13: スマホは手元にあり、遠くからは盗みにくい */
const InHand: React.FC = () => {
  const { enter } = useBeat();
  const thief = enter(13);
  const phone = enter(13, { delay: 10 });
  const reach = enter(13, { delay: 40 });
  const blocked = enter(13, { delay: 70 });
  const lineY = 370;
  const gapX = (THIEF_C.x + 110 + HELD.x) / 2;
  return (
    <g opacity={enter(13, { frames: 10 }) * (1 - enter(14, { frames: 10 }))}>
      <Person x={THIEF_C.x} y={THIEF_C.y} p={thief} tint={color.accent} />
      <Label x={THIEF_C.x} y={THIEF_C.y + 140} size={30} fill={color.accent} opacity={thief}>
        犯人
      </Label>
      <Box x={THIEF_C.x - 110} y={THIEF_C.y + 190} w={220} h={64} p={thief} />
      <Label x={THIEF_C.x - 86} y={THIEF_C.y + 222} size={24} anchor="start" opacity={thief}>
        パスワード
      </Label>
      <Check x={THIEF_C.x + 78} y={THIEF_C.y + 222} p={thief} s={0.45} />

      <Phone x={HELD.x} y={HELD.y} p={phone}>
        <KeyIcon x={HELD.x + 66} y={HELD.y + 130} p={phone} />
        <Digits text={OTP} x={HELD.x + 100 - 74} y={HELD.y + 220} size={34} pitch={21} />
      </Phone>
      <Label x={HELD.x + PHONE.w / 2} y={HELD.y + PHONE.h + 50} size={36} opacity={phone}>
        手元
      </Label>

      <Arrow from={[THIEF_C.x + 110, lineY]} to={[HELD.x - 16, lineY]} p={reach} tint={color.accent} />
      <Label x={gapX} y={lineY - 50} size={24} fill={color.muted} opacity={reach}>
        ネット越し
      </Label>
      <Cross x={gapX} y={lineY} p={blocked} r={28} />
    </g>
  );
};

const LOCK_TOP = 180;
const ROW = { x: CX - 240, y: 480, w: 480, h: 80, step: 110 };
const ROWS = [
  { label: "パスワード", ok: true },
  { label: "スマホの6桁", ok: false },
];

/** 拍14: 両方そろわないと入れない */
const Locked: React.FC = () => {
  const { enter } = useBeat();
  const lock = enter(14);
  const rows = [enter(14, { delay: 10 }), enter(14, { delay: 25 })];
  const note = enter(14, { delay: 45 });
  const top = LOCK_TOP;
  return (
    <g opacity={lock}>
      <g stroke={color.ink} strokeWidth={8} strokeLinecap="round" fill="none">
        <path d={`M ${CX - 60} ${top + 80} L ${CX - 60} ${top + 40} A 60 60 0 0 1 ${CX + 60} ${top + 40} L ${CX + 60} ${top + 80}`} {...draw(lock)} />
        <rect x={CX - 95} y={top + 80} width={190} height={150} rx={18} {...draw(lock)} />
      </g>
      <circle cx={CX} cy={top + 150} r={16} fill={color.ink} opacity={lock} />

      {ROWS.map(({ label, ok }, i) => {
        const y = ROW.y + i * ROW.step;
        return (
          <g key={label}>
            <Box x={ROW.x} y={y} w={ROW.w} h={ROW.h} p={rows[i]} />
            <Label x={ROW.x + 32} y={y + ROW.h / 2} size={36} anchor="start" opacity={rows[i]}>
              {label}
            </Label>
            {ok ? (
              <Check x={ROW.x + ROW.w - 48} y={y + ROW.h / 2} p={rows[i]} s={0.7} />
            ) : (
              <Cross x={ROW.x + ROW.w - 48} y={y + ROW.h / 2} p={rows[i]} r={22} />
            )}
          </g>
        );
      })}
      <Label x={CX} y={ROW.y + ROW.step * 2 + 40} size={28} fill={color.muted} opacity={note}>
        知っているもの ＋ 持っているもの
      </Label>
    </g>
  );
};

export const Visuals: React.FC = () => (
  <>
    <Sfx name="tick" at={1} delay={10} />
    <Sfx name="pop" at={1} delay={72} />
    <Sfx name="done" at={2} delay={90} />
    <Sfx name="miss" at={4} delay={80} />
    <Sfx name="pop" at={5} />
    <Sfx name="pop" at={6} />
    <Sfx name="tick" at={7} delay={10} />
    <Sfx name="pop" at={8} delay={6} />
    <Sfx name="tick" at={8} delay={100} />
    <Sfx name="done" at={9} delay={80} />
    <Sfx name="miss" at={10} delay={60} />
    <Sfx name="pop" at={11} delay={10} />
    <Sfx name="pop" at={12} delay={25} />
    <Sfx name="miss" at={13} delay={70} />
    <Sfx name="miss" at={14} delay={25} />
    <svg width={STAGE_BOX.width} height={STAGE_BOX.height}>
      <Intro />
      <Delivered />
      <Computed />
      <Proof />
      <Leaked />
      <InHand />
      <Locked />
    </svg>
  </>
);
