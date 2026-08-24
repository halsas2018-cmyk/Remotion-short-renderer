import React, { createContext, useContext, useMemo, useEffect, useState } from "react";
import {
  AbsoluteFill,
  Sequence,
  useVideoConfig,
  Audio,
  staticFile,
  interpolate,
  Easing,
  useCurrentFrame,
  getInputProps,
} from "remotion";
import { PersistentBackground } from "./PersistentBackground";
import { ChartCounter } from "./ChartCounter";
import { ChartComparison } from "./ChartComparison";
import { ChartLine } from "./ChartLine";
import { IconText } from "./IconText";
import { KeyStatement } from "./KeyStatement";
import { Timeline } from "./Timeline";
import { ProcessFlow } from "./ProcessFlow";
import { VersusCard } from "./VersusCard";
import { MapLocation } from "./MapLocation";
import { QuoteCard } from "./QuoteCard";
import { ProgressMeter } from "./ProgressMeter";
import { SceneTransition } from "./SceneTransition";
import { KineticCaptions } from "./KineticCaptions";
import { BeforeAfter } from "./BeforeAfter";

interface TimedBeat {
  type: string;
  startFrame: number;
  durationInFrames: number;
  [key: string]: unknown;
}

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface MotionGraphicsVideoProps {
  projectDir: string;
}

// ============================================
// BEAT CONTEXT FOR CAPTION CONTROL
// ============================================
interface BeatContextValue {
  currentBeatType: string | null;
}

const BeatContext = createContext<BeatContextValue>({ currentBeatType: null });

export const useBeatContext = (): BeatContextValue => {
  return useContext(BeatContext);
};

// Component types that should SHOW captions (visual/data components)
const CAPTION_ENABLED_TYPES = new Set([
  "chart_counter",
  "chart_comparison",
  "chart_line",
  "progress_meter",
  "map_location",
  "timeline",
  "process_flow",
  "versus",
  "icon_text",
  "quote_card",
  "before_after",
]);

// Component types that should HIDE captions (text/statement components)
const CAPTION_DISABLED_TYPES = new Set([
  "key_statement",
  "plain_text",
]);

// ============================================
// PHASE 1: DATA PREPROCESSING (Safety Net)
// ============================================
const MIN_BEAT_FRAMES = 45; // 1.5s minimum at 30fps

const COUNTER_TYPES = new Set(["chart_counter", "chart_line", "progress_meter"]);

const SOUND_MAP: Record<string, { file: string; volume: number }> = {
  chart_counter: { file: "sfx-counter.mp3", volume: 0.25 },
  chart_line: { file: "sfx-counter.mp3", volume: 0.25 },
  progress_meter: { file: "sfx-counter.mp3", volume: 0.25 },
  default: { file: "sfx-whoosh.mp3", volume: 0.18 },
};

const COUNTER_FADE_FRAMES = 10;

const EXIT_DIRECTIONS = ["up", "down", "left", "right"] as const;
const ENTRY_DIRECTIONS = ["down", "up", "right", "left"] as const;

const componentMap: Record<string, React.ComponentType<Record<string, unknown>>> = {
  chart_counter: ChartCounter,
  chart_comparison: ChartComparison,
  chart_line: ChartLine,
  icon_text: IconText,
  key_statement: KeyStatement,
  timeline: Timeline,
  process_flow: ProcessFlow,
  versus: VersusCard,
  map_location: MapLocation,
  quote_card: QuoteCard,
  progress_meter: ProgressMeter,
  before_after: BeforeAfter,
};

export const MotionGraphicsVideo: React.FC = () => {
  const { width, height } = useVideoConfig();
  const { projectDir } = getInputProps<MotionGraphicsVideoProps>();

  // State for dynamically loaded assets
  const [beats, setBeats] = useState<TimedBeat[]>([]);
  const [words, setWords] = useState<WordTimestamp[]>([]);
  const [narrationUrl, setNarrationUrl] = useState<string>("");
  const [totalDurationInFrames, setTotalDurationInFrames] = useState<number>(0);
  const [fps, setFps] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load project assets on mount
  useEffect(() => {
    if (!projectDir) {
      setError("projectDir prop is required");
      setLoading(false);
      return;
    }

    const loadAssets = async () => {
      try {
        // Normalize projectDir to ensure it's a valid path
        const base = projectDir.replace(/\/$/, "");
        
        // Fetch beats.json
        const beatsRes = await fetch(`${base}/beats.json`);
        if (!beatsRes.ok) throw new Error(`Failed to load beats.json: ${beatsRes.status}`);
        const beatsData = await beatsRes.json();
        
        // Fetch word_timestamps.json
        const wordsRes = await fetch(`${base}/word_timestamps.json`);
        if (!wordsRes.ok) throw new Error(`Failed to load word_timestamps.json: ${wordsRes.status}`);
        const wordsData = await wordsRes.json();

        // Narration audio URL
        const narration = `${base}/narration.mp3`;

        // Validate beats structure
        if (!beatsData.beats || !Array.isArray(beatsData.beats)) {
          throw new Error("beats.json missing 'beats' array");
        }
        if (!beatsData.fps || !beatsData.totalDurationInFrames) {
          throw new Error("beats.json missing fps or totalDurationInFrames");
        }

        setBeats(beatsData.beats);
        setWords(wordsData);
        setNarrationUrl(narration);
        setFps(beatsData.fps);
        setTotalDurationInFrames(beatsData.totalDurationInFrames);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error loading project assets");
        setLoading(false);
      }
    };

    loadAssets();
  }, [projectDir]);

  // Validate and clamp beat durations
  const validatedBeats: TimedBeat[] = useMemo(() => {
    return beats.map((beat, index) => {
      if (beat.durationInFrames < MIN_BEAT_FRAMES) {
        console.warn(
          `[MotionGraphicsVideo] Beat ${index} (${beat.type}) duration too short: ${beat.durationInFrames}f → clamping to ${MIN_BEAT_FRAMES}f`
        );
        return { ...beat, durationInFrames: MIN_BEAT_FRAMES };
      }
      return beat;
    });
  }, [beats]);

  // Precompute exit/entry directions with continuous linking
  const beatsWithDirections = useMemo(() => {
    return validatedBeats.map((beat, index) => {
      const exitDirection = EXIT_DIRECTIONS[index % EXIT_DIRECTIONS.length];
      const entryDirection = index === 0
        ? "up"
        : EXIT_DIRECTIONS[(index - 1) % EXIT_DIRECTIONS.length];

      return {
        ...beat,
        exitDirection,
        entryDirection,
      };
    });
  }, [validatedBeats]);

  // BeatProvider component - determines current beat type from global frame
  const BeatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const frame = useCurrentFrame();

    const currentBeat = useMemo(() => {
      return beatsWithDirections.find(
        (beat) => frame >= beat.startFrame && frame < beat.startFrame + beat.durationInFrames
      ) || null;
    }, [frame, beatsWithDirections]);

    const contextValue = useMemo<BeatContextValue>(
      () => ({ currentBeatType: currentBeat?.type || null }),
      [currentBeat?.type]
    );

    return (
      <BeatContext.Provider value={contextValue}>
        {children}
      </BeatContext.Provider>
    );
  };

  // Loading / error states
  if (loading) {
    return (
      <AbsoluteFill style={{ width, height, backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 32, color: "#4a4a4a", fontFamily: "system-ui, sans-serif" }}>
          Loading project assets…
        </div>
      </AbsoluteFill>
    );
  }

  if (error) {
    return (
      <AbsoluteFill style={{ width, height, backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
        <div style={{ fontSize: 28, color: "#dc2626", fontFamily: "system-ui, sans-serif", textAlign: "center", maxWidth: 800 }}>
          <strong>Failed to load project:</strong><br/>{error}<br/><br/>
          <small>Pass <code>projectDir</code> via --props, e.g.:<br/>
          <code>--props='{"projectDir": "output/09_08_short_vids/your-slug"}'</code></small>
        </div>
      </AbsoluteFill>
    );
  }

  if (beatsWithDirections.length === 0) {
    return (
      <AbsoluteFill style={{ width, height, backgroundColor: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
        <div style={{ fontSize: 28, color: "#e86c00", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
          No beats found in project.
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: "transparent",
      }}
    >
      <BeatProvider>
        {/* ============================================
            AUDIO LAYERS
            ============================================ */}

        {/* 1. NARRATION: full duration at frame 0 */}
        <Audio
          src={narrationUrl}
          startFrom={0}
          endAt={totalDurationInFrames}
          volume={1.0}
        />

        {/* 2. AMBIENT BED: continuous background */}
        <Audio
          src={staticFile("sfx-ambient.mp3")}
          startFrom={0}
          endAt={totalDurationInFrames}
          volume={0.35}
        />

        {/* 3. PER-BEAT SOUND EFFECTS */}
        {beatsWithDirections.map((beat, index) => {
          const originalBeat = validatedBeats[index];
          const isShortBeat = originalBeat && originalBeat.durationInFrames < MIN_BEAT_FRAMES;

          const soundConfig = SOUND_MAP[beat.type] || SOUND_MAP.default;
          const isWhoosh = soundConfig.file === "sfx-whoosh.mp3";
          const isCounter = COUNTER_TYPES.has(beat.type);

          if (isShortBeat && isWhoosh) {
            return null;
          }

          if (isCounter) {
            const beatDuration = beat.durationInFrames;
            const fadeStartFrame = Math.max(0, beatDuration - COUNTER_FADE_FRAMES);

            return (
              <Sequence
                key={`sfx-${index}`}
                from={beat.startFrame}
                durationInFrames={beatDuration}
              >
                <Audio
                  src={staticFile(soundConfig.file)}
                  startFrom={0}
                  endAt={beatDuration}
                  volume={(frame) => {
                    if (frame >= fadeStartFrame) {
                      return interpolate(frame, [fadeStartFrame, beatDuration], [soundConfig.volume, 0], {
                        easing: Easing.linear,
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      });
                    }
                    return soundConfig.volume;
                  }}
                />
              </Sequence>
            );
          }

          return (
            <Sequence
              key={`sfx-${index}`}
              from={beat.startFrame}
              durationInFrames={beat.durationInFrames}
            >
              <Audio
                src={staticFile(soundConfig.file)}
                startFrom={0}
                volume={soundConfig.volume}
              />
            </Sequence>
          );
        })}

        {/* Persistent background spanning full duration - bottom layer */}
        <Sequence from={0} durationInFrames={totalDurationInFrames}>
          <PersistentBackground />
        </Sequence>

        {/* Kinetic Captions - only renders during caption-enabled beats */}
        <KineticCaptions
          captionEnabledTypes={CAPTION_ENABLED_TYPES}
          beats={beatsWithDirections}
          words={words}
        />

        {/* Sequence each beat with exact validated timing, wrapped in SceneTransition */}
        {beatsWithDirections.map((beat, index) => {
          const Component = componentMap[beat.type] || KeyStatement;
          const { type, startFrame, durationInFrames, exitDirection, entryDirection, ...props } = beat;

          return (
            <Sequence
              key={index}
              from={startFrame}
              durationInFrames={durationInFrames}
            >
              <SceneTransition
                durationInFrames={durationInFrames}
                startFrame={startFrame}
                exitDirection={exitDirection}
                entryDirection={entryDirection}
              >
                <Component
                  {...props}
                  durationInFrames={durationInFrames}
                />
              </SceneTransition>
            </Sequence>
          );
        })}
      </BeatProvider>
    </AbsoluteFill>
  );
};
