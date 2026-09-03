import React from "react";

/* ------------------------------------------------------------------ */
/*  SourceBadge — persistent top-right attribution pill               */
/*                                                                     */
/*  A small white pill that lives in the top-right corner of every    */
/*  video frame, showing the news source (e.g. "TechCrunch AI") with  */
/*  an orange accent dot and a tiny chain-link glyph to signal "this  */
/*  is where the story came from".                                    */
/*                                                                     */
/*  Positioning:                                                      */
/*    - absolute, top: 80, right: 60.                                 */
/*    - The logo (PersistentBackground.tsx) sits at top:80, left:180, */
/*      height:180 with a 4:1 aspect → bounding box x=[180, 900].     */
/*      A ~160-180px pill ending at right:60 starts around x=820-900 */
/*      on 1080-wide frames. For short source names (<12 chars) the  */
/*      badge tucks cleanly to the right of the logo with a 20-40px  */
/*      gap. For longer names the badge may sit visually beneath the */
/*      logo's right end (the pill is 40px tall, the logo is 180px    */
/*      tall, so they share the y=80-120 band but the badge is small  */
/*      enough to not occlude the wordmark).                          */
/*                                                                     */
/*  Why this is a separate component:                                 */
/*    - It mounts OUTSIDE any <Sequence> in MotionGraphicsVideo.tsx,  */
/*      so useCurrentFrame() inside it returns the GLOBAL frame,    */
/*      which is what makes it persist for the whole composition.     */
/*    - It does NOT use idle motion / emphasis cycle / scene motion  */
/*      — those are for the per-beat content. A persistent chrome    */
/*      element should be quiet so the beat content carries the eye. */
/*                                                                     */
/*  Returns null when source is empty so a missing source never      */
/*  renders a broken-looking empty pill.                              */
/* ------------------------------------------------------------------ */

const ACCENT_COLOR = "#e86c00";
const INK = "#1a1a1a";
const MUTED = "#666666";
const BORDER = "#e8e8e8";

const PILL_FONT_FAMILY =
  "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

const PILL_FONT_SIZE = 14;
const PILL_HEIGHT = 40;
const PILL_HORIZONTAL_PADDING = 16;
const PILL_VERTICAL_PADDING = 8;
const DOT_SIZE = 6;
const DOT_GAP = 8;
const LINK_ICON_SIZE = 12;
const LINK_ICON_GAP = 10;
const MAX_TEXT_WIDTH = 140;

/* Inline chain-link SVG. Renders at LINK_ICON_SIZE × LINK_ICON_SIZE.
   Pure presentational — not clickable. Two interlocking "C" shapes
   rotated to look like a chain. */
const ChainLinkIcon: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0 }}
    aria-hidden="true"
  >
    {/* First chain link (top-left) */}
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
    {/* Second chain link (bottom-right) */}
    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);

export type SourceBadgeProps = {
  /** Display name of the news source, e.g. "TechCrunch AI". */
  source: string;
  /** Optional URL the badge hints at. Not clickable in the rendered
   *  video; kept as a prop so future caption/CTA cards could link
   *  to it without changing the component contract. */
  sourceUrl?: string;
};

/**
 * Persistent top-right source attribution pill.
 *
 * Mounted as a sibling of `<PersistentBackground>` at the root of
 * `MotionGraphicsVideo`, outside any `<Sequence>`, so it persists for
 * the entire composition. Returns null when `source` is empty.
 */
export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source,
  // sourceUrl is accepted but not rendered (no link glyph click in
  // mp4/png). The prop exists for the test composition + future use.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sourceUrl: _sourceUrl,
}) => {
  if (!source || source.trim() === "") {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        right: 60,
        display: "inline-flex",
        alignItems: "center",
        height: PILL_HEIGHT,
        padding: `${PILL_VERTICAL_PADDING}px ${PILL_HORIZONTAL_PADDING}px`,
        backgroundColor: "#ffffff",
        border: `1px solid ${BORDER}`,
        borderRadius: PILL_HEIGHT / 2,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {/* Accent dot — same design language as the rest of the cards */}
      <div
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: "50%",
          backgroundColor: ACCENT_COLOR,
          flexShrink: 0,
        }}
      />
      <div style={{ width: DOT_GAP }} />

      {/* Source name — truncate with ellipsis if it exceeds MAX_TEXT_WIDTH.
          Using a fixed max width keeps the pill from overflowing into the
          logo safe zone for very long source names (e.g. "Hacker News"). */}
      <div
        style={{
          fontFamily: PILL_FONT_FAMILY,
          fontSize: PILL_FONT_SIZE,
          fontWeight: 500,
          color: INK,
          letterSpacing: 0.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: MAX_TEXT_WIDTH,
          lineHeight: 1,
        }}
      >
        {source}
      </div>
      <div style={{ width: LINK_ICON_GAP }} />
      <ChainLinkIcon size={LINK_ICON_SIZE} color={MUTED} />
    </div>
  );
};

export default SourceBadge;
