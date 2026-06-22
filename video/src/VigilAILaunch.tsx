import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { FPS } from "./constants";
import { ColdOpen } from "./scenes/ColdOpen";
import { Problem } from "./scenes/Problem";
import { Intro } from "./scenes/Intro";
import { Pipeline } from "./scenes/Pipeline";
import { LiveDetection } from "./scenes/LiveDetection";
import { ViolationTypes } from "./scenes/ViolationTypes";
import { Dashboard } from "./scenes/Dashboard";
import { Evidence } from "./scenes/Evidence";
import { Impact } from "./scenes/Impact";
import { BeyondDetection } from "./scenes/BeyondDetection";

/**
 * VigilAI Launch Video — Main Composition
 *
 * Uses TransitionSeries to play all scenes sequentially with
 * smooth fade transitions between them.
 *
 * NOTE: TransitionSeries overlaps scenes during transitions,
 * so the total duration is: sum(durations) - sum(transition_durations).
 * We account for this by padding scene durations.
 */

/** Duration of each fade transition in frames. */
const TRANSITION_DUR = 20;

/** Scene durations in frames (each includes padding for the transition overlap). */
const SCENE_DURATIONS = {
  coldOpen:      5 * FPS,   // 5s
  problem:       10 * FPS,  // 10s
  intro:         5 * FPS,   // 5s
  pipeline:      20 * FPS,  // 20s
  liveDetection: 15 * FPS,  // 15s
  violationTypes: 10 * FPS, // 10s
  dashboard:     12 * FPS,  // 12s
  evidence:      5 * FPS,   // 5s
  beyondDetection: 8 * FPS, // 8s
  impact:        10 * FPS,  // 10s
};

export const VigilAILaunch: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0E1A" }}>
      <TransitionSeries>
        {/* Scene 1: Cold Open */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.coldOpen}>
          <ColdOpen />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DUR })}
        />

        {/* Scene 2: The Problem */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.problem}>
          <Problem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DUR })}
        />

        {/* Scene 3: VigilAI Intro */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.intro}>
          <Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DUR })}
        />

        {/* Scene 4: Pipeline */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.pipeline}>
          <Pipeline />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DUR })}
        />

        {/* Scene 5: Live Detection */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.liveDetection}>
          <LiveDetection />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DUR })}
        />

        {/* Scene 6: Violation Types */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.violationTypes}>
          <ViolationTypes />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DUR })}
        />

        {/* Scene 7: Dashboard */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.dashboard}>
          <Dashboard />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DUR })}
        />

        {/* Scene 8: Evidence */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.evidence}>
          <Evidence />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DUR })}
        />

        {/* Scene 9: Beyond Detection */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.beyondDetection}>
          <BeyondDetection />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DUR })}
        />

        {/* Scene 10: Impact + Closing */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.impact}>
          <Impact />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
