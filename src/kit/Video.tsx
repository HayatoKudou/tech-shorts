import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, type CalculateMetadataFunction, staticFile } from "remotion";
import { BeatContext } from "./beat";
import { Caption } from "./Caption";
import { FONT } from "./font";
import { type Script, validateScript } from "./script";
import { CAPTION_BOX, color, FPS, SAFE, STAGE_BOX } from "./theme";
import { assertTimingMatches, narrationPath, type Timing, timingPath } from "./timing";

export type VideoProps = {
  /** null なら calculateMetadata が public/audio/<id>/timing.json を読んで埋める */
  timing: Timing | null;
  /** セーフゾーン・字幕帯・図の領域を重ねて表示する（Studio の props で切り替え） */
  guides: boolean;
};

/** 台本と、その動画専用の図から Composition を作る。Visuals は STAGE_BOX の座標系で描く */
export const makeVideo = (script: Script, Visuals: React.FC) => {
  const calculateMetadata: CalculateMetadataFunction<VideoProps> = async ({ props }) => {
    validateScript(script);
    const timing = props.timing ?? (await fetchTiming(script.id));
    assertTimingMatches(script, timing);
    return {
      durationInFrames: Math.ceil(timing.duration * FPS),
      props: { ...props, timing },
    };
  };

  const component: React.FC<VideoProps> = ({ timing, guides }) => {
    if (!timing) throw new Error("timing が未解決です");
    const starts = timing.beats.map((b) => Math.round(b.start * FPS));
    return (
      <BeatContext.Provider value={starts}>
        <AbsoluteFill style={paper}>
          <Audio src={staticFile(narrationPath(script.id))} />
          <div style={{ position: "absolute", ...STAGE_BOX }}>
            <Visuals />
          </div>
          <Caption beats={script.beats} />
          {timing.source === "draft" ? <DraftMark /> : null}
          {guides ? <Guides /> : null}
        </AbsoluteFill>
      </BeatContext.Provider>
    );
  };

  return { id: script.id, component, calculateMetadata };
};

const fetchTiming = async (id: string): Promise<Timing> => {
  const res = await fetch(staticFile(timingPath(id)));
  if (!res.ok) {
    throw new Error(
      `${timingPath(id)} がありません。npm run narrate -- ${id} --draft（仮音声）か、録音後に npm run narrate -- ${id} を実行してください`,
    );
  }
  return res.json();
};

/** 紙は動かさず、ドットは 2px 以上にする（投稿先の再エンコードで細い線がちらつくため） */
const paper: React.CSSProperties = {
  backgroundColor: color.paper,
  backgroundImage: `radial-gradient(circle, ${color.dot} 2.5px, transparent 3px)`,
  backgroundSize: "48px 48px",
  backgroundPosition: "24px 24px",
};

/** 仮音声のまま投稿しないよう、画面下に目印を焼き込む */
const DraftMark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      bottom: SAFE.bottom - 120,
      padding: "8px 20px",
      border: `4px solid ${color.accent}`,
      color: color.accent,
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 40,
    }}
  >
    仮音声
  </div>
);

const Guides: React.FC = () => (
  <AbsoluteFill>
    {[CAPTION_BOX, STAGE_BOX].map((box, i) => (
      <div
        key={i}
        style={{ position: "absolute", ...box, backgroundColor: "rgba(47, 85, 151, 0.1)" }}
      />
    ))}
    <div
      style={{
        position: "absolute",
        ...SAFE,
        outline: `3px dashed ${color.accent}`,
      }}
    />
  </AbsoluteFill>
);
