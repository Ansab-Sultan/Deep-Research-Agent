from __future__ import annotations

import inspect
from typing import Any


async def _maybe_await(value: Any) -> Any:
    if inspect.isawaitable(value):
        return await value
    return value


async def create_startup_indexes(mongo_db: Any) -> list[str]:
    """
    Create MongoDB indexes used by history and job listing paths.
    Safe to call multiple times at startup.
    """
    reports = mongo_db.reports
    if not hasattr(reports, "create_index"):
        return []

    created: list[str] = []
    index_specs = [
        ([("created_at", -1)], {"name": "idx_reports_created_at_desc"}),
        ([("depth", 1), ("created_at", -1)], {"name": "idx_reports_depth_created_at_desc"}),
        ([("title", 1)], {"name": "idx_reports_title"}),
    ]

    for keys, options in index_specs:
        result = await _maybe_await(reports.create_index(keys, **options))
        created.append(str(result or options["name"]))

    return created
