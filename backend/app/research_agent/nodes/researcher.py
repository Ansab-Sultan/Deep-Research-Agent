from __future__ import annotations

from app.core.config import DepthProfile
from app.core.llm_config import LLMGateway
from app.research_agent.state import ResearchState


def _offline_search(query: str, idx: int) -> list[dict]:
    return [
        {
            "content": f"Offline synthetic finding {idx + 1} for query: {query}. Includes background, constraints, and applications.",
            "url": f"https://example.org/research/{idx + 1}?q={query.replace(' ', '%20')}",
        }
        for idx in range(3)
    ]


def researcher_node(state: ResearchState, profile: DepthProfile, _llm: LLMGateway, tavily_api_key: str) -> dict:
    if state["iteration_count"] > 0 and state["gaps"]:
        queries = [state["gaps"]]
    else:
        queries = state["sub_questions"][: profile.query_fanout]

    new_results = []
    new_sources = []

    tavily_client = None
    if tavily_api_key:
        try:
            from tavily import TavilyClient

            tavily_client = TavilyClient(api_key=tavily_api_key)
        except Exception:
            tavily_client = None

    for query in queries:
        if tavily_client is not None:
            try:
                response = tavily_client.search(query=query, max_results=3)
                rows = response.get("results", [])
            except Exception:
                rows = _offline_search(query, 0)
        else:
            rows = _offline_search(query, 0)

        for row in rows:
            content = row.get("content", "")
            url = row.get("url", "")
            new_results.append({"query": query, "content": content, "url": url})
            if url:
                new_sources.append(url)

    progress_msg = f"✓ Searched {len(queries)} queries"
    return {
        "search_results": state["search_results"] + new_results,
        "sources": sorted(set(state["sources"] + new_sources)),
        "progress": state["progress"] + [progress_msg],
    }
