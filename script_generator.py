#!/root/kinetic_typo_vid/venv/bin/python3
"""
script_generator.py
Step 2 of the Shorts pipeline: script + headline generation (NO beats).

Produces:
  - the narration script (6-9 sentences, hook-first, concrete-grounded)
  - 5 headline options + a chosen headline
  - youtube_title + youtube_description

Beats are generated later by beat_generator.py using exact Whisper timings.
"""

import os
import re
import json
from pathlib import Path

# Import the new provider-agnostic LLM client
import llm_client

# Auto-load .env for key
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            _k, _v = _k.strip(), _v.strip().strip('"').strip("'")
            if _k == "GROQ_API_KEY" and not os.environ.get(_k):
                os.environ[_k] = _v

# Word targets sized for ~33-45s Shorts at ~3.9 words/sec narration rate
MAX_WORDS = 150
MIN_WORDS = 110

SCRIPT_MAX_TOKENS = 4096

# Banned filler loaded from config.py (allows env override)
from config import BANNED_FILLER


def _call_llm(messages: list[dict], temperature: float = 0.5,
              max_tokens: int = 1024,
              model_key: str = llm_client.DEFAULT_MODEL_KEY) -> str:
    """Wrapper over llm_client.call_llm for backward compatibility."""
    return llm_client.call_llm(
        messages=messages,
        model_key=model_key,
        temperature=temperature,
        max_tokens=max_tokens,
    )


# ---------------------------------------------------------------------------
# Step 2 — Script + headline generation (NO beats)
# ---------------------------------------------------------------------------

SCRIPT_SYSTEM_PROMPT = f"""You are writing a script for a short-form vertical
video (30-45 seconds) about a tech/AI news story. Your only goal is to make
someone stop scrolling, watch to the end, and WANT to comment.

Audience: the GENERAL PUBLIC — people who do NOT work in tech, do not know what
an LLM/parameter/benchmark is. Write at a 6th-grade reading level. If a
12-year-old wouldn't say it, rewrite it. Plain words only.

SOURCE MATERIAL (fetched for you — use it; do NOT invent facts):
{{SOURCE}}

SCRIPT RULES:
1. HOOK (sentence 1, 0-3s): Open with a SPECIFIC, CONCRETE detail from the
   source that creates IMMEDIATE CURIOSITY OR ANTICIPATION — a real number, a
   named person/community/tool, or a surprising fact pulled from the article or
   comments. Make the viewer NEED to know what happens next. NEVER open with
   "Imagine...", "What if...", "Have you ever...", "Picture this...". A vague
   generality ("a debate is brewing") is a failure.
   → GOOD: "The guy who built the AI that beat the world champion at Go just got demoted."
   → BAD: "Google announced a leadership change at DeepMind."

2. SPECIFICITY: Use real names, real numbers, and quotes/paraphrased opinions
   from the article and comments. Vague paraphrase is a failure state.

3. EMOTIONAL ARC: Vary the tone sentence to sentence — curiosity/stakes,
   tension/conflict, relatable anxiety, then a turn or payoff. Do not stay flat
   and explanatory throughout.

4. HUMAN TOUCH + PERSONALITY: Write like telling a friend something wild you
   just read over coffee. Contractions fine. Mix short punchy sentences with
   longer ones. No corporate hedging, no press-release tone.
   → Add a dash of dry humor, irony, or a relatable "wait, what?" moment.
   → Use visual language: things you can SEE (a boardroom, a laptop, a whiteboard
     covered in math, engineers staring at screens).
   → Avoid abstract nouns: "leadership transition" → "the boss got swapped";
     "strategic pivot" → "they changed the plan."

5. END WITH A GENUINE QUESTION: The FINAL sentence MUST be a real, specific
   question tied to the story's stakes — something viewers can actually answer
   in comments. NEVER end with generic filler like "be part of the conversation",
   "what do you think", "let me know", "drop a comment", or "thoughts?".
   Good: "Would you trust an AI to write your medical records?"
   Good: "If you're building the next breakthrough AI, do you want a scientist or a suit running the lab?"
   Bad: "What do you think about this?"

6. LENGTH: 6-9 sentences total, {MIN_WORDS}-{MAX_WORDS} words. Aim for the
   middle of the word range.

7. PLAIN NARRATION: clean punctuation for text-to-speech, no jargon, no acronyms
   without explanation, no emojis/symbols/markdown, no brackets or directions.

HEADLINE + YOUTUBE METADATA RULES:
Generate 5 headline options (on-screen hook). Each must create a curiosity gap
using a CONCRETE noun from the story (a name, tool, number, or group) — not a
generic phrase. Under 8 words. The chosen_headline is the one you'd put on-screen
as the hook text.
Bad: "Coding Just Got Personal"
Good: "This Subreddit Banned ChatGPT Code"

ALSO generate:
- youtube_title: punchy, ≤60 chars, curiosity-gap, YouTube-SEO style (NOT the raw
  source title). Banned: "You won't believe", all-caps shouting, clickbait that
  doesn't match the content.
- youtube_description: 1-2 line short caption (≤200 chars) ending with relevant
  hashtags, suitable to paste into Shorts description box.

OUTPUT FORMAT (strict JSON, no markdown fences, no preamble):
{{
  "script": "Sentence one. Sentence two. Sentence three...",
  "headline_options": ["...", "...", "...", "...", "..."],
  "chosen_headline": "...",
  "youtube_title": "...",
  "youtube_description": "..."
}}
"""


def _source_block(story: dict, content: dict) -> str:
    """Build the SOURCE MATERIAL block from fetched content."""
    parts = [
        f"Title: {story.get('title','')}",
        f"Source: {story.get('source','')}",
    ]
    body = (content.get("article_text") or "").strip()
    parts.append(f"Article body: {body if body else '(no article text — rely on the title and your judgement)'}")
    comments = content.get("comments") or []
    if comments:
        cblock = "\n".join(f"- {c}" for c in comments)
        parts.append(f"Community discussion (comments):\n{cblock}")
    return "\n".join(parts)


def generate_script(story: dict, content: dict,
                    retry_feedback: str = "",
                    model_key: str = llm_client.DEFAULT_MODEL_KEY) -> dict:
    """One LLM call → script + headlines. Validates + retries once."""
    source = _source_block(story, content)
    system = SCRIPT_SYSTEM_PROMPT.replace("{SOURCE}", source)
    user_prompt = "Write the script + 5 headlines + youtube metadata now."
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_prompt},
    ]
    if retry_feedback:
        messages.append({"role": "assistant", "content": "(previous output rejected)"})
        messages.append({"role": "user", "content": retry_feedback})

    raw = _call_llm(messages, temperature=0.7, max_tokens=SCRIPT_MAX_TOKENS, model_key=model_key)
    if not raw or not raw.strip():
        raise RuntimeError(f"LLM returned empty response for model '{model_key}'")
    parsed = _parse_script(raw)
    if not parsed:
        raise RuntimeError(f"LLM script output was not valid JSON: {raw[:200]}")

    # Validate — one retry if banned filler slips in
    problems = _validate_script(parsed, story)
    if problems and not retry_feedback:
        fb = "Your previous output had these problems; fix them and return the full JSON again:\n- " + "\n- ".join(problems)
        print(f"  [validator] retrying: {len(problems)} issue(s): {problems[0]}")
        return generate_script(story, content, retry_feedback=fb)

    script = parsed["script"].strip()
    word_count = len(script.split())

    # Calculate script quality metrics
    all_words = script.lower().split()
    unique_words = set(all_words)
    lexical_diversity = len(unique_words) / len(all_words) if all_words else 0
    
    quality_metrics = {
        "word_count": word_count,
        "lexical_diversity": round(lexical_diversity, 3),
        "unique_words": len(unique_words),
    }

    return {
        "script": script,
        "headline_options": parsed.get("headline_options", []),
        "headline": (parsed.get("chosen_headline") or "").strip(),
        "youtube_title": (parsed.get("youtube_title") or "").strip(),
        "youtube_description": (parsed.get("youtube_description") or "").strip(),
        "word_count": word_count,
        "quality_metrics": quality_metrics,
    }


def _parse_script(raw: str) -> dict | None:
    """Parse the script JSON, tolerating markdown fences / extra prose."""
    if not raw:
        return None
    txt = raw.strip()
    txt = re.sub(r"^```(?:json)?|```$", "", txt, flags=re.MULTILINE).strip()
    if not txt.startswith("{"):
        m = re.search(r"\{.*\}", txt, flags=re.DOTALL)
        if m:
            txt = m.group(0)
    try:
        obj = json.loads(txt)
    except json.JSONDecodeError:
        return None
    if not isinstance(obj, dict):
        return None
    if "script" not in obj or not isinstance(obj["script"], str):
        return None
    return obj


def _validate_script(parsed: dict, story: dict = None) -> list[str]:
    """Return a list of problems that warrant a single rewrite (empty = OK)."""
    problems = []
    script = (parsed.get("script") or "").strip()
    low = script.lower()
    
    # Banned filler
    for b in BANNED_FILLER:
        if low.startswith(b) or (" " + b) in low or low == b:
            problems.append(f'script contains banned filler "{b}": "{script[:50]}"')
            break
    
    # Word count
    word_count = len(script.split())
    if not (MIN_WORDS <= word_count <= MAX_WORDS):
        problems.append(f"word count {word_count} outside {MIN_WORDS}-{MAX_WORDS} target")
    
    # Sentence count (rough)
    sentences = re.split(r'[.!?]+', script)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not (6 <= len(sentences) <= 9):
        problems.append(f"sentence count {len(sentences)} outside 6-9 target")
    
    # Headline sanity
    if not parsed.get("chosen_headline"):
        problems.append("missing chosen_headline")
    elif story:
        headline = parsed.get("chosen_headline", "").lower()
        source_text = (story.get("title", "") + " " + story.get("summary", "")).lower()
        headline_words = set(re.findall(r'\b\w{4,}\b', headline))
        source_words = set(re.findall(r'\b\w{4,}\b', source_text))
        if headline_words and source_words:
            overlap = headline_words & source_words
            if not overlap:
                problems.append(f'headline "{parsed.get("chosen_headline")}" shares no meaningful words with source title/summary')
        
        has_number = bool(re.search(r'\b\d+[kKmMbB%]?\b', parsed.get("chosen_headline", "")))
        has_proper_noun = bool(re.search(r'\b[A-Z][a-z]+\b', parsed.get("chosen_headline", "")))
        if not (has_number or has_proper_noun):
            problems.append(f'headline "{parsed.get("chosen_headline")}" lacks specific entity (number, name, or proper noun) — make it concrete')
    
    # Validate headline options
    for opt in parsed.get("headline_options", []):
        opt_lower = opt.lower()
        opt_words = set(re.findall(r'\b\w{4,}\b', opt_lower))
        if opt_words and story:
            source_text = (story.get("title", "") + " " + story.get("summary", "")).lower()
            source_words = set(re.findall(r'\b\w{4,}\b', source_text))
            overlap = opt_words & source_words
            if not overlap:
                problems.append(f'headline option "{opt}" shares no meaningful words with source')
                break
    
    # youtube metadata sanity
    yt_title = (parsed.get("youtube_title") or "").strip()
    if not yt_title:
        problems.append("missing youtube_title")
    elif len(yt_title) > 60:
        problems.append(f"youtube_title exceeds 60 chars ({len(yt_title)})")
    yt_desc = (parsed.get("youtube_description") or "").strip()
    if not yt_desc:
        problems.append("missing youtube_description")
    elif len(yt_desc) > 200:
        problems.append(f"youtube_description exceeds 200 chars ({len(yt_desc)})")
    return problems


def process_story(story: dict, content: dict | None = None,
                  model_key: str = llm_client.DEFAULT_MODEL_KEY) -> dict:
    """End-to-end Step 2 for one story: script + headlines only."""
    # --- Step 1.5: fetch real content (unless the caller already did) ---
    if content is None:
        from article_fetcher import fetch_article_content
        content = fetch_article_content(story)

    print(f"Writing script + headlines: {story['title'][:60]}...")
    result = generate_script(story, content, model_key=model_key)
    script = result["script"]
    print(f"  ✓ script ({result['word_count']} words, headline: \"{result['headline']}\")")

    research = {
        "source_kind": content.get("source_kind", "rss"),
        "used_fallback": content.get("used_fallback", False),
        "fallback_reason": content.get("fallback_reason", ""),
        "article_chars": content.get("article_chars", 0),
        "comment_count": content.get("comment_count", 0),
        "headline_options": result.get("headline_options", []),
        "fetched_at": content.get("fetched_at", ""),
    }
    result["research"] = research
    result["story"] = story
    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1].startswith("http"):
        from article_fetcher import fetch_article_content
        story = {"title": "(from URL)", "source": "cli", "link": sys.argv[1], "summary": ""}
        res = process_story(story)
        print(json.dumps({k: v for k, v in res.items() if k != "story"}, indent=2)[:4000])
    else:
        test_story = {
            "title": "Google DeepMind reshuffle — Demis Hassabis moves from CEO to chair",
            "source": "TLDR AI",
            "link": "https://example.com",
            "summary": "Hassabis moves to chair; a new head of Gemini takes the CEO role.",
        }
        result = process_story(test_story)
        out = {k: v for k, v in result.items() if k != "story"}
        print(f"Script: {out['script']}")
        print(f"Word count: {out['word_count']}")
        print(json.dumps(out, indent=2)[:4000])
