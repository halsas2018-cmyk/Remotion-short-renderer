# news_fetcher.py (lines 480-495)
# Optional LLM editorial rerank
if not no_llm_rank and candidates:
    try:
        from llm_ranker import rerank_stories
        print(f"Running LLM editorial rerank with model: {rank_model_key or 'default'}...")
        candidates = rerank_stories(candidates, model_key=rank_model_key)
    except Exception as e:
        print(f"  [warn] LLM rerank failed: {e}, falling back to heuristic order")
