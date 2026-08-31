/* ============================================================== */
/*  Registry unit tests (Phase 2.2)                               */
/*                                                                  */
/*  These tests are the type-system-equivalent guard for the      */
/*  per-beat Zod schemas. They verify:                             */
/*                                                                  */
/*    1. Per-type happy paths: every registered beat type accepts  */
/*       a minimal valid fixture AND a fixture with the type's     */
/*       optional fields included.                                 */
/*    2. Per-type invalid paths: every registered beat type        */
/*       rejects a wrong-type value for a required field, and the  */
/*       ZodError's first-issue path is the field path (e.g.       */
/*       ["icon"] for icon_text, not an opaque "metadata" message).*/
/*    3. The registry and the BeatType union are in sync.          */
/*    4. The kinetic-captions gate is correct (data-vis beats show */
/*       captions, text/card beats do not).                        */
/*    5. The metadata adapter converts Python's minimal shapes     */
/*       (string `left`/`right`, string `events[]`/`steps[]`)     */
/*       into the rich shapes the components expect.               */
/*    6. PerBeatSchema / TimedBeatsSchema dispatch to the right    */
/*       per-type schema and preserve the per-type field path.     */
/*                                                                  */
/*  Pure data tests, no React, no jsdom. Run with `npm test`.      */
/* ============================================================== */

import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import {
  getBeatComponent,
  validateBeatMetadata,
  isBeatTypeSupported,
  adaptMetadata,
  registry,
} from "./registry";
import {
  BeatType,
  PerBeatSchema,
  TimedBeatsSchema,
} from "./types";
import {
  CAPTION_VISIBLE_BEAT_TYPES,
  shouldShowKineticCaptions,
} from "./renderBeat";

/* ============================================================== */
/*  Test helpers                                                   */
/* ============================================================== */

/** Build a base beat fixture: every beat has type, startFrame, durationInFrames. */
const baseBeat = (
  type: string,
  extras: Record<string, unknown> = {},
) => ({
  type,
  startFrame: 0,
  durationInFrames: 90,
  ...extras,
});

/**
 * Asserts that `fn` throws a ZodError whose first issue has the
 * given path. Used by the per-type invalid-case tests to verify
 * the per-type Zod schema reports the correct field path (e.g.
 * `["icon"]` for `icon_text` with `icon: 42`, not an opaque
 * `["metadata"]` message).
 */
const expectZodErrorAt = (
  fn: () => unknown,
  path: (string | number)[],
) => {
  let caught: unknown;
  try {
    fn();
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(ZodError);
  const issues = (caught as ZodError).issues;
  expect(issues.length).toBeGreaterThan(0);
  expect(issues[0].path).toEqual(path);
};

/**
 * Runs the three standard per-type tests for a registered beat type:
 *  1. Valid: a minimal fixture with just the required fields passes.
 *  2. Optional: a fixture with the type's optional fields preserves them.
 *  3. Invalid: a fixture with one required field passed a wrong type
 *     throws a ZodError with the expected field path.
 *
 * This is the load-bearing test for the per-type schema contract.
 * Without it, a future beat type could ship a too-permissive schema
 * and Python pipeline bugs would slip through silently.
 */
const runTypeTests = (config: {
  type: string;
  required: Record<string, unknown>;
  optional?: Record<string, unknown>;
  invalid: { field: string; value: unknown; path: (string | number)[] };
}) => {
  it("accepts a minimal valid beat", () => {
    const fixture = baseBeat(config.type, config.required);
    expect(() => validateBeatMetadata(config.type, fixture)).not.toThrow();
  });

  if (config.optional) {
    it("accepts optional fields and preserves them", () => {
      const fixture = baseBeat(config.type, {
        ...config.required,
        ...config.optional,
      });
      const result = validateBeatMetadata(config.type, fixture) as Record<
        string,
        unknown
      >;
      for (const [key, value] of Object.entries(config.optional)) {
        expect(result[key]).toEqual(value);
      }
    });
  }

  it(`rejects ${config.invalid.field} with wrong type`, () => {
    const fixture = baseBeat(config.type, {
      ...config.required,
      [config.invalid.field]: config.invalid.value,
    });
    expectZodErrorAt(
      () => validateBeatMetadata(config.type, fixture),
      config.invalid.path,
    );
  });
};

/* ============================================================== */
/*  2.1 — Per-type happy paths (one describe per registered type) */
/* ============================================================== */

describe("per-type validation", () => {
  describe("key_statement", () => {
    runTypeTests({
      type: "key_statement",
      required: { text: "Hello world" },
      optional: { emphasisWords: ["Hello", "world"], endFrame: 90 },
      invalid: { field: "text", value: 99, path: ["text"] },
    });
  });

  describe("headline_card", () => {
    runTypeTests({
      type: "headline_card",
      required: { text: "Big headline" },
      optional: {
        emphasisWords: ["Big"],
        backgroundColor: "#ffffff",
        accentColor: "#e86c00",
        textColor: "#000000",
        endFrame: 90,
      },
      invalid: { field: "text", value: 99, path: ["text"] },
    });
  });

  describe("plain_text", () => {
    runTypeTests({
      type: "plain_text",
      required: { text: "Just text" },
      optional: { endFrame: 90 },
      invalid: { field: "text", value: 99, path: ["text"] },
    });
  });

  describe("icon_text", () => {
    runTypeTests({
      type: "icon_text",
      required: { text: "Hello", icon: "info" },
      optional: { emphasisWords: ["Hello"], endFrame: 90 },
      invalid: { field: "icon", value: 42, path: ["icon"] },
    });
  });

  describe("chart_line", () => {
    runTypeTests({
      type: "chart_line",
      required: { points: [{ label: "a", value: 1 }] },
      optional: { text: "context", exitDirection: "up", endFrame: 90 },
      invalid: {
        field: "points",
        value: [{ label: "x" }],
        path: ["points", 0, "value"],
      },
    });
  });

  describe("chart_counter", () => {
    runTypeTests({
      type: "chart_counter",
      required: { value: 42, label: "x" },
      optional: { text: "context", endFrame: 90 },
      invalid: { field: "value", value: true, path: ["value"] },
    });
  });

  describe("chart_comparison_3d", () => {
    runTypeTests({
      type: "chart_comparison_3d",
      required: { items: [{ label: "a", value: 1 }] },
      optional: { text: "context", endFrame: 90 },
      invalid: {
        field: "items",
        value: [{ label: "x" }],
        path: ["items", 0, "value"],
      },
    });
  });

  describe("progress_meter", () => {
    runTypeTests({
      type: "progress_meter",
      required: { value: 50, maxValue: 100, label: "x" },
      optional: { text: "context", endFrame: 90 },
      invalid: { field: "maxValue", value: "100", path: ["maxValue"] },
    });
  });

  describe("timeline", () => {
    runTypeTests({
      type: "timeline",
      required: { events: ["a"] },
      optional: { text: "context", endFrame: 90 },
      invalid: { field: "events", value: "a", path: ["events"] },
    });
  });

  describe("versus", () => {
    runTypeTests({
      type: "versus",
      required: { left: "a", right: "b" },
      optional: { text: "context", emphasisWords: ["a"], endFrame: 90 },
      invalid: { field: "left", value: 42, path: ["left"] },
    });
  });

  describe("before_after", () => {
    runTypeTests({
      type: "before_after",
      required: { beforeLabel: "a", afterLabel: "b" },
      optional: { text: "context", emphasisWords: ["a"], endFrame: 90 },
      invalid: { field: "beforeLabel", value: 99, path: ["beforeLabel"] },
    });
  });

  describe("map_3d", () => {
    runTypeTests({
      type: "map_3d",
      required: { locationName: "x", latitude: 0, longitude: 0 },
      optional: {
        text: "context",
        buildings: [{ name: "Tower" }],
        endFrame: 90,
      },
      invalid: { field: "latitude", value: "north", path: ["latitude"] },
    });
  });

  describe("process_flow", () => {
    runTypeTests({
      type: "process_flow",
      required: { steps: ["a"] },
      optional: { text: "context", endFrame: 90 },
      invalid: { field: "steps", value: "a", path: ["steps"] },
    });
  });

  describe("quote_card", () => {
    runTypeTests({
      type: "quote_card",
      required: { quote: "x" },
      optional: {
        text: "context",
        attribution: "y",
        author: "z",
        emphasisWords: ["x"],
        endFrame: 90,
      },
      invalid: { field: "quote", value: 99, path: ["quote"] },
    });
  });

  describe("stat_pill", () => {
    runTypeTests({
      type: "stat_pill",
      required: { value: 42, label: "x" },
      optional: { prefix: "$", suffix: "M", endFrame: 90 },
      invalid: { field: "value", value: true, path: ["value"] },
    });
  });

  describe("quote_attribution", () => {
    runTypeTests({
      type: "quote_attribution",
      required: { quote: "x", attribution: "y" },
      optional: { emphasisWords: ["x"], endFrame: 90 },
      invalid: { field: "quote", value: 99, path: ["quote"] },
    });
  });

  describe("compare_split", () => {
    runTypeTests({
      type: "compare_split",
      required: { left: "a", right: "b" },
      optional: { leftLabel: "x", rightLabel: "y", endFrame: 90 },
      invalid: { field: "left", value: 42, path: ["left"] },
    });
  });

  describe("location_pulse", () => {
    runTypeTests({
      type: "location_pulse",
      required: { locationName: "x", latitude: 0, longitude: 0 },
      optional: { endFrame: 90 },
      invalid: { field: "latitude", value: "north", path: ["latitude"] },
    });
  });

  describe("scrollytelling", () => {
    runTypeTests({
      type: "scrollytelling",
      required: { title: "x", body: "y" },
      optional: { emphasisWords: ["x"], endFrame: 90 },
      invalid: { field: "title", value: 99, path: ["title"] },
    });
  });

  describe("ticker_tape", () => {
    runTypeTests({
      type: "ticker_tape",
      required: { stories: ["a"] },
      optional: { label: "BREAKING", endFrame: 90 },
      invalid: { field: "stories", value: "a", path: ["stories"] },
    });
  });
});

/* ============================================================== */
/*  2.2 — getBeatComponent / isBeatTypeSupported / registry sync  */
/* ============================================================== */

describe("getBeatComponent", () => {
  it.each(BeatType)("returns a component for %s", (type) => {
    expect(getBeatComponent(type)).toBeTruthy();
  });

  it.each([
    "foo_bar",
    "",
    "KEY_STATEMENT",
    "key-statement",
    "key statement",
  ])("returns null for unknown type %j", (type) => {
    expect(getBeatComponent(type)).toBeNull();
  });
});

describe("isBeatTypeSupported", () => {
  it.each(BeatType)("returns true for %s", (type) => {
    expect(isBeatTypeSupported(type)).toBe(true);
  });

  it.each(["foo_bar", "", "KEY_STATEMENT"])(
    "returns false for unknown type %j",
    (type) => {
      expect(isBeatTypeSupported(type)).toBe(false);
    },
  );
});

describe("registry / BeatType sync", () => {
  it("registry keys match BeatType members exactly", () => {
    // Bidirectional check: no registry entry is missing a type, and
    // no type is missing a registry entry. This is the "registry and
    // type union are in sync" test that catches the 11-stale-import
    // bug pattern (a type added to BeatType but not wired into
    // registry, or vice versa).
    const registryKeys = [...Object.keys(registry)].sort();
    const beatTypeMembers = [...BeatType].sort();
    expect(registryKeys).toEqual(beatTypeMembers);
  });
});

/* ============================================================== */
/*  2.3 — shouldShowKineticCaptions (data-vis vs text/card gate)  */
/* ============================================================== */

describe("shouldShowKineticCaptions", () => {
  it.each([...CAPTION_VISIBLE_BEAT_TYPES])(
    "returns true for data-vis beat type %s",
    (type) => {
      expect(shouldShowKineticCaptions(type)).toBe(true);
    },
  );

  it.each(BeatType.filter((t) => !CAPTION_VISIBLE_BEAT_TYPES.has(t)))(
    "returns false for text/card beat type %s",
    (type) => {
      expect(shouldShowKineticCaptions(type)).toBe(false);
    },
  );
});

/* ============================================================== */
/*  2.4 — adaptMetadata (Python shape → component shape)          */
/* ============================================================== */

describe("adaptMetadata", () => {
  it("converts versus.left from string to {label, value, items}", () => {
    const result = adaptMetadata("versus", {
      type: "versus",
      left: "A string",
      right: "B string",
    });
    expect(result.left).toEqual({ label: "A string", value: "", items: [] });
    expect(result.right).toEqual({ label: "B string", value: "", items: [] });
  });

  it("versus: when left is an object, currently overwrites with empty default", () => {
    // NOTE: The current adapter always overwrites left/right with
    // { label: "", value: "", items: [] } regardless of input shape.
    // The schema's z.union admits { label: string } but the adapter
    // doesn't preserve it — `typeof beat.left === "string"` is false
    // for an object, so `leftStr` falls through to "". This may be a
    // bug: VersusCard expects { label, value, items }, so an incoming
    // { label: "X" } would lose its label. Flagging for review.
    // The smoke test passes today because the Python pipeline always
    // emits the string variant, so this branch is never hit in
    // production. If a future caller passes the object form, the
    // fix is to special-case it in the adapter (e.g. spread the
    // incoming object into { label, value: "", items: [] }).
    const result = adaptMetadata("versus", {
      type: "versus",
      left: { label: "Already an object" },
      right: "B string",
    });
    expect(result.left).toEqual({ label: "", value: "", items: [] });
    expect(result.right).toEqual({ label: "B string", value: "", items: [] });
  });

  it("versus: when left/right are undefined, falls back to empty default", () => {
    // Edge case: the schema's z.union would reject undefined
    // (neither string nor object), but adaptMetadata is called
    // after validation so undefined shouldn't reach it in practice.
    // We test the fallback anyway so the helper's behaviour is
    // fully specified.
    const result = adaptMetadata("versus", { type: "versus" });
    expect(result.left).toEqual({ label: "", value: "", items: [] });
    expect(result.right).toEqual({ label: "", value: "", items: [] });
  });

  it("converts timeline.events from string[] to {marker, label}[]", () => {
    const result = adaptMetadata("timeline", {
      type: "timeline",
      events: ["a", "b", "c"],
    });
    expect(result.events).toEqual([
      { marker: "Step 1", label: "a" },
      { marker: "Step 2", label: "b" },
      { marker: "Step 3", label: "c" },
    ]);
  });

  it("timeline: empty events array passes through", () => {
    const result = adaptMetadata("timeline", {
      type: "timeline",
      events: [],
    });
    expect(result.events).toEqual([]);
  });

  it("converts process_flow.steps to events with numeric markers", () => {
    // process_flow maps steps → events with `1`-style markers (not
    // "Step 1"-style) because the existing Timeline fallback was
    // designed for a numeric step list.
    const result = adaptMetadata("process_flow", {
      type: "process_flow",
      steps: ["a", "b"],
    });
    expect(result.events).toEqual([
      { marker: "1", label: "a" },
      { marker: "2", label: "b" },
    ]);
  });

  it("process_flow: empty steps array passes through", () => {
    const result = adaptMetadata("process_flow", {
      type: "process_flow",
      steps: [],
    });
    expect(result.events).toEqual([]);
  });

  it("passes through other types unchanged", () => {
    // key_statement, headline_card, icon_text, and the other
    // types that don't need shape translation should return the
    // input object as-is. We test three representative cases.
    const keyStatement = { type: "key_statement", text: "Hello" };
    expect(adaptMetadata("key_statement", keyStatement)).toEqual(keyStatement);

    const headline = { type: "headline_card", text: "Big text" };
    expect(adaptMetadata("headline_card", headline)).toEqual(headline);

    const iconText = { type: "icon_text", text: "x", icon: "info" };
    expect(adaptMetadata("icon_text", iconText)).toEqual(iconText);
  });
});

/* ============================================================== */
/*  2.5 — PerBeatSchema / TimedBeatsSchema (top-level dispatcher) */
/* ============================================================== */

describe("TimedBeatsSchema", () => {
  const validTimedBeats = (beats: unknown[]) => ({
    fps: 30,
    totalDurationInFrames: 300,
    beats,
  });

  it("accepts a valid TimedBeats with one beat of each registered type", () => {
    // This is the "every registered type round-trips through
    // PerBeatSchema → beatSchema" test. If a new beat type is added
    // to the registry without a corresponding fixture here, the
    // test is still useful (it just doesn't exercise the new type)
    // — but a missing fixture is a signal to add one.
    const mk = (type: string, extras: Record<string, unknown>) => ({
      type,
      startFrame: 0,
      durationInFrames: 30,
      ...extras,
    });
    const beats = [
      mk("key_statement", { text: "x" }),
      mk("headline_card", { text: "x" }),
      mk("plain_text", { text: "x" }),
      mk("icon_text", { text: "x", icon: "info" }),
      mk("chart_line", { points: [{ label: "a", value: 1 }] }),
      mk("chart_counter", { value: 1, label: "x" }),
      mk("chart_comparison_3d", { items: [{ label: "a", value: 1 }] }),
      mk("progress_meter", { value: 50, maxValue: 100, label: "x" }),
      mk("timeline", { events: ["a"] }),
      mk("versus", { left: "a", right: "b" }),
      mk("before_after", { beforeLabel: "a", afterLabel: "b" }),
      mk("map_3d", { locationName: "x", latitude: 0, longitude: 0 }),
      mk("process_flow", { steps: ["a"] }),
      mk("quote_card", { quote: "x" }),
      mk("stat_pill", { value: 1, label: "x" }),
      mk("quote_attribution", { quote: "x", attribution: "y" }),
      mk("compare_split", { left: "a", right: "b" }),
      mk("location_pulse", { locationName: "x", latitude: 0, longitude: 0 }),
      mk("scrollytelling", { title: "x", body: "y" }),
      mk("ticker_tape", { stories: ["a"] }),
    ];
    const result = TimedBeatsSchema.safeParse(validTimedBeats(beats));
    expect(result.success).toBe(true);
  });

  it("rejects unknown beat type with path [beats, N, type]", () => {
    // The dispatcher in PerBeatSchema adds an issue at path ["type"]
    // when the type is not in the registry. TimedBeatsSchema wraps
    // the array, so the full path is ["beats", 0, "type"].
    const beats = [
      { type: "foo_bar", text: "x", startFrame: 0, durationInFrames: 30 },
    ];
    const result = TimedBeatsSchema.safeParse(validTimedBeats(beats));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["beats", 0, "type"]);
    }
  });

  it("forwards per-type field path on validation failure", () => {
    // This is the regression test for the bug that Horizon 0.2 fixed:
    // PerBeatSchema must forward the per-type schema's issue path
    // (e.g. ["icon"] for icon_text with icon: 42) into its
    // superRefine context, AND TimedBeatsSchema must prepend
    // ["beats", N] so the user sees the full path. Without
    // `.passthrough()` on the base object OR the superRefine
    // forwarding, the path would be lost and the user would see an
    // opaque "metadata" message.
    const beats = [
      {
        type: "icon_text",
        text: "x",
        icon: 42,
        startFrame: 0,
        durationInFrames: 30,
      },
    ];
    const result = TimedBeatsSchema.safeParse(validTimedBeats(beats));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["beats", 0, "icon"]);
    }
  });

  it("rejects empty beats array", () => {
    // TimedBeatsSchema requires `beats: z.array(PerBeatSchema).min(1)`.
    // A render with zero beats is a pipeline bug (the Python script
    // always emits at least one beat), but the schema should still
    // catch it loudly.
    const result = TimedBeatsSchema.safeParse(validTimedBeats([]));
    expect(result.success).toBe(false);
  });
});

describe("PerBeatSchema", () => {
  it("accepts a valid beat with all required fields", () => {
    const beat = {
      type: "key_statement",
      text: "x",
      startFrame: 0,
      durationInFrames: 30,
    };
    const result = PerBeatSchema.safeParse(beat);
    expect(result.success).toBe(true);
  });

  it("rejects unknown beat type with path [type]", () => {
    const beat = {
      type: "foo_bar",
      text: "x",
      startFrame: 0,
      durationInFrames: 30,
    };
    const result = PerBeatSchema.safeParse(beat);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["type"]);
    }
  });
});
