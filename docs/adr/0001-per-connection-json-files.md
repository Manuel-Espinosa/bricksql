# Per-connection JSON files for persistence

Rather than a single flat JSON file for all data, each Connection owns two files: one for its configuration and one for its Saved Queries. Deleting a Connection means deleting both files — no cascade logic needed beyond a directory removal.

We chose this over a single monolithic JSON to avoid the merge-conflict-on-write problem (a single file becomes a contention point if we ever move to concurrent writes) and to make the cascade delete trivially correct. The trade-off is slightly more filesystem operations per request, which is acceptable for a single-user self-hosted tool.

## Considered Options

- **Single `data.json`** — simpler to start, but cascade deletes require mutating a shared structure, and the file grows unbounded as connections accumulate.
- **Per-connection directory** (chosen) — `data/{id}/connection.json` + `data/{id}/queries.json`. Delete = `rm -rf data/{id}/`.
