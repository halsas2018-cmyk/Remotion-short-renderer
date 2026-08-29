import React from "react";
import { Composition } from "remotion";
import { MotionGraphicsVideo } from "./MotionGraphicsVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MotionGraphicsVideo"
        component={MotionGraphicsVideo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
