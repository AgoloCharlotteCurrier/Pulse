"""Adapter that imports and runs the last30days-skill pipeline."""

import json
import sys
from pathlib import Path

# Add last30days-skill/scripts to sys.path so we can import its modules
_SKILL_SCRIPTS = Path(__file__).resolve().parents[2] / "last30days-skill" / "scripts"
if str(_SKILL_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SKILL_SCRIPTS))

from last30days import run_research  # noqa: E402
from lib import dates, dedupe, models, normalize, render, schema, score  # noqa: E402


def _build_config(openai_key: str, xai_key: str) -> dict:
    """Build config dict matching what env.get_config() returns."""
    return {
        "OPENAI_API_KEY": openai_key,
        "XAI_API_KEY": xai_key,
        "OPENAI_MODEL_POLICY": "auto",
        "OPENAI_MODEL_PIN": None,
        "XAI_MODEL_POLICY": "latest",
        "XAI_MODEL_PIN": None,
    }


def execute_research(
    topic: str,
    days_back: int = 30,
    sources: str = "auto",
    depth: str = "default",
    openai_key: str = "",
    xai_key: str = "",
) -> dict:
    """Run the full research pipeline and return report dict.

    This is a blocking call — wrap in asyncio.to_thread() from the router.
    """
    config = _build_config(openai_key, xai_key)

    # Resolve sources based on available keys
    if sources == "auto":
        has_openai = bool(config.get("OPENAI_API_KEY"))
        has_xai = bool(config.get("XAI_API_KEY"))
        if has_openai and has_xai:
            sources = "both"
        elif has_openai:
            sources = "reddit"
        elif has_xai:
            sources = "x"
        else:
            raise ValueError("No API keys configured")

    selected_models = models.get_models(config)
    from_date, to_date = dates.get_date_range(days_back)

    # Run research (parallel Reddit + X fetching)
    reddit_items, x_items, _web_needed, raw_openai, raw_xai, _raw_enriched, reddit_error, x_error = run_research(
        topic, sources, config, selected_models, from_date, to_date, depth=depth
    )

    # Processing pipeline (mirrors main() lines 428-466)
    normalized_reddit = normalize.normalize_reddit_items(reddit_items, from_date, to_date)
    normalized_x = normalize.normalize_x_items(x_items, from_date, to_date)

    filtered_reddit = normalize.filter_by_date_range(normalized_reddit, from_date, to_date)
    filtered_x = normalize.filter_by_date_range(normalized_x, from_date, to_date)

    scored_reddit = score.score_reddit_items(filtered_reddit)
    scored_x = score.score_x_items(filtered_x)

    sorted_reddit = score.sort_items(scored_reddit)
    sorted_x = score.sort_items(scored_x)

    deduped_reddit = dedupe.dedupe_reddit(sorted_reddit)
    deduped_x = dedupe.dedupe_x(sorted_x)

    # Determine mode string
    mode_map = {
        "both": "both",
        "reddit": "reddit-only",
        "x": "x-only",
        "all": "all",
    }
    mode = mode_map.get(sources, sources)

    report = schema.create_report(
        topic, from_date, to_date, mode,
        selected_models.get("openai"),
        selected_models.get("xai"),
    )
    report.reddit = deduped_reddit
    report.x = deduped_x
    report.reddit_error = reddit_error
    report.x_error = x_error
    report.context_snippet_md = render.render_context_snippet(report)

    return report.to_dict()
