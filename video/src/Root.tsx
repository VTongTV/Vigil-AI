import React from "react";
import { Composition } from "remotion";
import { VigilAILaunch } from "./VigilAILaunch";
import { VIDEO_WIDTH, VIDEO_HEIGHT, FPS, TOTAL_DURATION_SECS } from "./constants";

/**
 * Root composition registration.
 * Remotion studio picks this up automatically.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VigilAILaunch"
      component={VigilAILaunch}
      durationInFrames={TOTAL_DURATION_SECS * FPS}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
  );
};
