# beat_generator.py — Fix Spec

Two related fixes to `beat_generator.py`. Do NOT rewrite the file — apply 
these as targeted edits to the existing functions. Read the existing code 
around each line reference before editing, since line numbers may have 
shifted slightly from what's quoted here.

---

## FIX 1: Whitespace-only strings bypass emptiness checks

### The bug
Three separate places check whether an LLM-provided field is "empty" using 
exact string equality (`== ""` or `!= ""`). A value of `" "` (single space) 
or `"  "` (multiple spaces) is NOT equal to `""`, so it passes every check 
as if it were valid content — even though it renders as blank. This 
silently defeats the existing retry/demotion safety net, since the model 
can satisfy a "never emit empty strings" instruction with a whitespace 
string instead of real content.

### Fix location 1 — initial merge (inside `generate_beats`, MODE A block, 
the loop building `beat` from `chunk`/`assignment`)

Find this line:
```python
if field in assignment and assignment[field] not in (None, "", [], 0, 0.0):
    beat[field] = assignment[field]
```

Replace with:
```python
raw_value = assignment.get(field)
is_blank = (
    raw_value is None
    or raw_value in ([], 0, 0.0)
    or (isinstance(raw_value, str) and raw_value.strip() == "")
)
if field in assignment and not is_blank:
    beat[field] = raw_value
```

### Fix location 2 — retry merge (inside the retry block, the loop that 
overwrites fields on beats that previously had empty fields)

Find this line (same pattern, different loop):
```python
if field in assignment and assignment[field] not in (None, "", [], 0, 0.0):
    beats[idx][field] = assignment[field]
```

Apply the SAME replacement pattern as Fix location 1, adapted to write into 
`beats[idx][field]` instead of `beat[field]`:
```python
raw_value = assignment.get(field)
is_blank = (
    raw_value is None
    or raw_value in ([], 0, 0.0)
    or (isinstance(raw_value, str) and raw_value.strip() == "")
)
if field in assignment and not is_blank:
    beats[idx][field] = raw_value
```

### Fix location 3 — `validate_beats()` function, the empty-string check for 
required string fields

Find this line:
```python
elif req_field in ("left", "right", "beforeLabel", "afterLabel",
                   "quote", "attribution", "label", "title", "body",
                   "locationName"):
    if beat[req_field] == "":
        errors.append(f"Beat {i} ({beat_type}): empty required field '{req_field}'")
```

Replace the inner condition with a whitespace-aware check:
```python
elif req_field in ("left", "right", "beforeLabel", "afterLabel",
                   "quote", "attribution", "label", "title", "body",
                   "locationName"):
    field_value = beat[req_field]
    if isinstance(field_value, str) and field_value.strip() == "":
        errors.append(f"Beat {i} ({beat_type}): empty (or whitespace-only) required field '{req_field}'")
```

### Verification for Fix 1
After applying, confirm all three locations use `.strip() == ""` (or the 
equivalent `is_blank` check) rather than `== ""` / `!= ""` directly. Grep 
the file for `== ""` and `!= ""` after editing — there should be none left 
that check LLM-provided string fields for emptiness. `_empty_required_fields` 
tracking (the list that triggers retry/demotion) must now correctly include 
any field that was whitespace-only, not just exactly `""`.

---

## FIX 2: Reduce prompt size in MODE A (pre-chunked path)

### 2a. Remove redundant script content
In `build_prompt()`, MODE A branch (`if pre_chunked_beats:`), the prompt 
currently includes BOTH `truncated_script` (via `{truncated_script}` in the 
main prompt f-string) AND the full text of every chunk (via 
`pre_chunked_section`, which embeds `chunks_for_llm` containing each 
chunk's `"text"` field). This sends the same script content twice.

Fix: when `pre_chunked_beats` is provided (MODE A only), remove the 
`Full script (for context): {truncated_script}` line from the prompt 
entirely — the chunks already contain the full script content in order, 
so this line is redundant. Do NOT remove `truncated_script` from MODE B 
(the `else` branch / no pre-chunked beats) — it's still needed there since 
MODE B has no chunks to draw text from.

### 2b. Filter beat type catalog to only arc-eligible types
Currently, `beat_types_with_hints` and `beat_type_examples_compact` always 
include ALL types in `BEAT_TYPES` (18 total), regardless of whether 
`story_arc` narrows down which types are actually usable for this story.

Fix: when `story_arc` is provided (non-None, non-empty), before building 
`beat_types_with_hints` and `beat_type_examples_compact`, compute the union 
of all types allowed across the story's arc:
```python
if story_arc:
    allowed_type_union = set()
    for label in story_arc:
        allowed_type_union.update(arc_allowed_types(label))
    types_to_include = allowed_type_union
else:
    types_to_include = set(BEAT_TYPES.keys())
```
Then filter both dicts to only these types:
```python
beat_types_with_hints = {
    btype: beat_types_with_hints[btype]
    for btype in beat_types_with_hints
    if btype in types_to_include
}
beat_type_examples_compact = {
    btype: beat_type_examples_compact[btype]
    for btype in beat_type_examples_compact
    if btype in types_to_include
}
```
Place this filtering AFTER both dicts are originally built (don't change 
how they're built, just filter the result), and BEFORE they're inserted 
into the prompt f-string.

IMPORTANT: `key_statement` and `headline_card` must ALWAYS be included in 
`types_to_include` regardless of arc filtering, since they're fallback 
types used elsewhere in the pipeline (e.g. `force_intro_to_headline_card`, 
the empty-field demotion path) — add them unconditionally after computing 
`types_to_include`:
```python
types_to_include.update({"key_statement", "headline_card"})
```

### 2c. Shorten verbose field-meaning descriptions
In `BEAT_TYPE_FIELD_HINTS`, trim any description longer than roughly 15 
words down to a shorter phrase that preserves the essential instruction. 
For example, the `versus.left`/`versus.right` entries are currently full 
sentences — shorten to something like: `"Short label, LEFT side (3-8 
words)"`. Apply this same trimming pass across all entries in 
`BEAT_TYPE_FIELD_HINTS` — keep the core instruction (what the field is, 
any word-count constraint) and drop elaboration/examples that the 
paired `BEAT_TYPE_EXAMPLES` entry already demonstrates.

### Verification for Fix 2
After applying, add a debug print right after `prompt = f"""..."""` is 
built in the MODE A branch (before `return prompt`), printing 
`len(prompt)` (character count) so the actual prompt size reduction is 
visible in the console output on the next real run. Compare this number 
before and after the fix to confirm a meaningful reduction.

---

## Testing both fixes together
After applying Fix 1 and Fix 2, run the pipeline against a real story and 
check the console output for:
1. The new prompt-length debug print (Fix 2 verification) — should show a 
   noticeably smaller number than before.
2. No more "Demoted N beat(s) with empty required fields to key_statement" 
   messages where N is unexpectedly high — if whitespace-only fields were 
   a meaningful chunk of prior demotions, this count should drop.
3. Manually inspect the "=== RAW LLM BEATS ===" debug output for any 
   remaining fields containing only whitespace — there should be none, 
   since Fix 1 should have caught and either retried or demoted them 
   correctly by the time beats reach final output.
