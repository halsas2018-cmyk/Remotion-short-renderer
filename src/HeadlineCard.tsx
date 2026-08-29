import React, { useEffect, useRef } from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { fitText, measureText } from "@remotion/layout-utils";
import { SceneTransition } from "./SceneTransition";

export const HeadlineCardSchema = z.object({
  text: z.string().min(1),
  emphasisWords: z.array(z.string()).default([]),
  backgroundColor: zColor().default("#0b0b0f"),
  accentColor: zColor().default("#f97316"),
  textColor: zColor().default("#ffffff"),
});

export type HeadlineCardProps = z.infer<typeof HeadlineCardSchema>;

// Same accent palette as KeyStatement so accents feel like part of one design system.
const DEFAULT_ACCENT = "#f97316";
const ACCENT_GLOW = "rgba(249, 115, 22, 0.4)";

type EmphasisRange = { start: number; end: number; variant: number };

export const HeadlineCard: React.FC<HeadlineCardProps> = ({
  text,
  emphasisWords = [],
  backgroundColor = "#0b0b0f",
  accentColor = DEFAULT_ACCENT,
  textColor = "#ffffff",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Animations must finish by 30–40% of the beat. After that the headline is
  // static so the viewer can read it; SceneTransition owns entrance/exit/cross-fade.
  const ANIMATION_END_PCT = 0.4;
  const animationEndFrame = Math.round(fps * 1.0 * ANIMATION_END_PCT); // 1.0s headline

  // Card scale-in: spring from 0.92 → 1.0, fully settled well before 40%.
  const cardScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110, mass: 0.7 },
  });
  const cardScaleActual = Math.min(1, 0.92 + 0.08 * cardScale);

  // Headline opacity ramp: 0 → 1 over the first 12% of the beat.
  const headlineOpacity = Math.min(1, frame / (fps * 0.12));

  // Accent bar grows from the left over the first 30%.
  const barProgress = Math.min(1, frame / animationEndFrame);

  // Headline sizing: start at a generous size and shrink to fit, like KeyStatement.
  const fitted = fitText({
    text,
    withinWidth: width * 0.78,
    withinHeight: height * 0.5,
    fontFamily: "Space Grotesk",
    fontWeight: "700",
  });
  const fontSize = Math.min(fitted.fontSize, 180);

  // Build per-word layout for emphasis annotations.
  const words = text.split(/\s+/);
  const wordMetrics = words.map((w) =>
    measureText({
      text: w,
      fontFamily: "Space Grotesk",
      fontWeight: "700",
      fontSize,
    }),
  );
  const space = 16;
  const totalWidth =
    wordMetrics.reduce((acc, m) => acc + m.width, 0) +
    (words.length - 1) * space;
  const startX = (width - totalWidth) / 2;
  const baselineY = height / 2;

  // Resolve emphasis ranges (character offsets into `text`) once per render.
  const emphasisRanges: EmphasisRange[] = React.useMemo(() => {
    if (emphasisWords.length === 0) return [];
    const lowerText = text.toLowerCase();
    const ranges: EmphasisRange[] = [];
    const usedStarts = new Set<number>();
    emphasisWords.forEach((emphasis, i) => {
      const lower = emphasis.toLowerCase();
      let from = 0;
      let idx = lowerText.indexOf(lower, from);
      while (idx !== -1) {
        if (!usedStarts.has(idx)) {
          usedStarts.add(idx);
          ranges.push({ start: idx, end: idx + emphasis.length, variant: i });
          break;
        }
        from = idx + 1;
        idx = lowerText.indexOf(lower, from);
      }
    });
    return ranges;
  }, [text, emphasisWords]);

  // Per-word render — wraps each word in a span with absolute position, and
  // overlays a CSS ring on the words that fall inside an emphasis range.
  // CSS-based highlights (not rough-notation) because the HeadlineCard's
  // font size and weight make the SVG strokes noisy at small sizes.
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Compute layout once (used by both the word spans and the overlay rings).
  const wordPositions = React.useMemo(() => {
    let x = startX;
    return words.map((w, i) => {
      const m = wordMetrics[i];
      const left = x;
      const top = baselineY - m.height;
      x += m.width + space;
      return { word: w, left, top, width: m.width, height: m.height };
    });
  }, [startX, baselineY, words, wordMetrics]);

  // No-op useEffect retained for API stability with KeyStatement (it doesn't
  // mount any DOM-side annotations either, so this is intentionally empty).
  useEffect(() => {
    return () => {
      // no cleanup
    };
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <SceneTransition>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            transform: `scale(${cardScaleActual})`,
            opacity: headlineOpacity,
          }}
        >
          {/* Accent bar — grows from the left, settled by 30%. */}
          <div
            style={{
              position: "absolute",
              top: height * 0.32,
              left: width * 0.12,
              width: 120 * barProgress,
              height: 6,
              backgroundColor: accentColor,
              boxShadow: `0 0 24px 6px ${ACCENT_GLOW}`,
              borderRadius: 3,
            }}
          />
          {/* Word layer — absolute-positioned spans for crisp alignment. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width,
              height,
              fontFamily: "Space Grotesk",
              fontWeight: 700,
              fontSize,
              color: textColor,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {wordPositions.map((p, i) => {
              const range = emphasisRanges.find(
                (r) => r.start <= i * 0 && i * 0 < r.end, // placeholder, replaced below
              );
              const charStart = words.slice(0, i).join(" ").length + (i > 0 ? 1 : 0);
              const charEnd = charStart + words[i].length;
              const matched = emphasisRanges.find(
                (r) => r.start < charEnd && r.end > charStart,
              );
              return (
                <span
                  key={i}
                  ref={(el) => (wordRefs.current[i] = el)}
                  style={{
                    position: "absolute",
                    left: p.left,
                    top: p.top,
                    width: p.width,
                    height: p.height,
                  }}
                >
                  {p.word}
                  {matched ? (
                    <EmphasisRing
                      variant={matched.variant}
                      color={accentColor}
                    />
                  ) : null}
                </span>
              );
            })}
          </div>
        </AbsoluteFill>
      </SceneTransition>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  EmphasisRing — pure-CSS highlight that mirrors KeyStatement's     */
/*  visual language without bringing in `rough-notation`.            */
/*                                                                     */
/*  Three variants so a list of emphasis words doesn't look uniform: */
/*    variant 0 → highlight  (filled translucent background)         */
/*    variant 1 → circle     (rounded outline ring)                  */
/*    variant 2 → underline  (thick bottom border)                    */
/* ------------------------------------------------------------------ */

const EmphasisRing: React.FC<{ variant: number; color: string }> = ({
  variant,
  color,
}) => {
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    inset: -6,
    pointerEvents: "none",
  };

  if (variant % 3 === 0) {
    // Highlight
    return (
      <span
        style={{
          ...baseStyle,
          backgroundColor: `${color}33`, // ~20% alpha
          borderRadius: 4,
        }}
      />
    );
  }

  if (variant % 3 === 1) {
    // Circle
    return (
      <span
        style={{
          ...baseStyle,
          border: `3px solid ${color}`,
          borderRadius: 999,
        }}
      />
    );
  }

  // Underline
  return (
    <span
      style={{
        ...baseStyle,
        borderBottom: `4px solid ${color}`,
        borderRadius: 0,
        inset: -2,
      }}
    />
  );
};
