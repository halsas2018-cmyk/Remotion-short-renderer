import React from "react";
import { loadFont, AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { Annotation } from "./lib/annotations/Annotation";
import { Highlight, Circle, Underline } from "rough-notation";
import { useEffect, useRef } from "react";
import { fitText, measureText, fillTextBox } from "@remotion/layout-utils";
import { SceneTransition } from "./SceneTransition";

// Match KeyStatement's font setup so HeadlineCard sits in the same visual family.
loadFont("normal", {
  family: "Space Grotesk",
  weights: ["500", "700"],
  subsets: ["latin"],
});

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
    measureText({ text: w, fontFamily: "Space Grotesk", fontWeight: "700", fontSize }),
  );
  const totalWidth = wordMetrics.reduce((acc, m) => acc + m.width, 0) + (words.length - 1) * 16;
  const startX = (width - totalWidth) / 2;
  const baselineY = height / 2;

  // Wire up rough-notation annotations (same approach as KeyStatement).
  const containerRef = useRef<HTMLDivElement>(null);
  const annotationsRef = useRef<Annotation[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const annotations: Annotation[] = [];
    const lowerText = text.toLowerCase();
    emphasisWords.forEach((emphasis, i) => {
      const idx = lowerText.indexOf(emphasis.toLowerCase());
      if (idx < 0) return;
      // Find which word index the match starts at.
      let charCount = 0;
      let targetWordIndex = -1;
      for (let w = 0; w < words.length; w++) {
        const next = charCount + words[w].length;
        if (idx >= charCount && idx < next) {
          targetWordIndex = w;
          break;
        }
        charCount = next + 1; // +1 for the space
      }
      const el = wordRefs.current[targetWordIndex];
      if (!el) return;
      // Alternate shapes so a list of emphasis words doesn't look uniform.
      const Shape = i % 3 === 0 ? Highlight : i % 3 === 1 ? Circle : Underline;
      const annotation = new Shape(el, {
        color: accentColor,
        strokeWidth: 3,
        padding: 6,
        animationDuration: 400,
      });
      annotations.push({ Component: annotation, color: accentColor });
    });
    annotationsRef.current = annotations;
    annotations.forEach((a) => a.Component.show());
    return () => {
      annotations.forEach((a) => a.Component.remove());
    };
  }, [text, emphasisWords, accentColor, words]);

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
          <div
            ref={containerRef}
            style={{
              fontFamily: "Space Grotesk",
              fontWeight: 700,
              fontSize,
              color: textColor,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              textAlign: "center",
              padding: "0 8%",
            }}
          >
            {words.map((w, i) => (
              <span
                key={i}
                ref={(el) => (wordRefs.current[i] = el)}
                style={{
                  display: "inline-block",
                  marginRight: i < words.length - 1 ? 16 : 0,
                }}
              >
                {w}
              </span>
            ))}
          </div>
        </AbsoluteFill>
      </SceneTransition>
    </AbsoluteFill>
  );
};
