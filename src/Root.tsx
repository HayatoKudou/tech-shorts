import React from "react";
import { Composition } from "remotion";
import { script as qrErrorCorrection } from "../videos/qr-error-correction/script";
import { Visuals as QrErrorCorrectionVisuals } from "../videos/qr-error-correction/Visuals";
import { FPS, HEIGHT, WIDTH } from "./kit/theme";
import { makeVideo } from "./kit/Video";

// 動画を1本足すたびにここへ1行足す
const videos = [makeVideo(qrErrorCorrection, QrErrorCorrectionVisuals)];

export const RemotionRoot: React.FC = () => (
  <>
    {videos.map((video) => (
      <Composition
        key={video.id}
        id={video.id}
        component={video.component}
        calculateMetadata={video.calculateMetadata}
        defaultProps={{ timing: null, guides: false }}
        durationInFrames={FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    ))}
  </>
);
