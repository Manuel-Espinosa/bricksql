# BrickSQL

Self-hosted, mobile-first SQL client for querying MySQL and PostgreSQL databases from any device. Designed for personal use via Docker + Tailscale, with a clean architecture to allow pro features (multi-user, roles) in the future.

## Language

**Connection**:
A saved configuration for reaching a database engine (host, port, credentials, database name, engine type). Identified by a user-given name.
_Avoid_: datasource, database config, server

**Saved Query**:
A named SQL script owned by a specific Connection, persisted across restarts. The full Script Mode buffer is saved — not just the statement under the cursor. Deleting a Connection deletes all its Saved Queries (cascade). Each Connection's Saved Queries are stored in their own separate file, co-located with the Connection's config file. Names are unique within a Connection; saving under an existing name asks for confirmation and, if accepted, overwrites that Saved Query.
_Avoid_: stored query, bookmark, snippet

**Active Connection**:
The Connection currently selected by the user, used as the target for table exploration and query execution.
_Avoid_: selected connection, current connection

**Table Explorer**:
The panel/view that lists the tables and columns of the Active Connection's database. For PostgreSQL, only the `public` schema is shown in the MVP. If the Connection has no database set, the Table Explorer shows a database selector first; the selection is persisted back to the Connection. Tapping a table populates the Script Mode editor with `SELECT * FROM <table> LIMIT 100` — it does not auto-execute.
_Avoid_: schema browser, database explorer

**Script Mode**:
The SQL editor sub-mode where the user types SQL directly as free text. The editor holds a multi-statement buffer — statements are delimited by semicolons (`;`), with EOF as the trailing boundary fallback. The primary execution gesture is **run at cursor**: executes the single statement the cursor is inside. Running the current text selection is also supported. Run all statements is post-MVP. Powered by CodeMirror 6 with schema-aware autocomplete and syntax highlighting.
_Avoid_: raw mode, text mode, manual mode

**Builder Mode**:
The SQL editor sub-mode where the user assembles a query step-by-step through UI blocks. MVP supported blocks: SELECT * / FROM / WHERE (column + operator + value with operators =, !=, >, <, >=, <=, LIKE, IS NULL, IS NOT NULL, chainable with AND/OR) / INNER JOIN / ORDER BY / LIMIT. The IN operator, GROUP BY, HAVING, specific column selection, and subqueries are post-MVP. Transitioning to Script Mode is one-way — edits made in Script Mode cannot be loaded back into Builder Mode.
_Avoid_: visual mode, block mode, Lego mode

**AI Mode**:
The SQL editor sub-mode where the user writes a natural-language prompt and a local Ollama model generates the SQL. Restricted to SELECT in the MVP. The user selects which Ollama model to use at request time from the list of models available in their Ollama instance. The SQL is returned to the client but never auto-executed.
_Avoid_: prompt mode, NL mode, Ollama mode

**Schema Context**:
The DDL representation of the Active Connection's database (all tables with column names, types, and nullability), built fresh from the DB at the moment of each AI Mode request and injected into the Ollama system prompt. Not persisted to disk.
_Avoid_: schema snapshot, schema file, schema cache

**Auth Credentials**:
The single username and password used to access the app, configured via `BRICKSQL_USER` and `BRICKSQL_PASSWORD` environment variables at startup. Not stored in the JSON — no first-run setup screen exists.
_Avoid_: admin user, setup user

**Script Buffer**:
The full text content of the Script Mode editor — a single editable document that may contain one or more SQL statements separated by semicolons. When a Saved Query is loaded, its content replaces the entire Script Buffer.
_Avoid_: editor content, script file, query text

**Results Table**:
The default grid rendering of a query's result set — one row per record, one column per field, read left-to-right. This is the baseline view; the Vertical View is its alternate rendering.
_Avoid_: result grid, results panel

**Vertical View**:
An alternate rendering of the Results Table where columns become rows, so column names read top-to-bottom instead of left-to-right. Works uniformly whether one or several rows are selected: each selected row becomes one value-column in the Vertical View. With a single row selected it reads as a field/value list; with multiple rows selected it becomes a side-by-side comparison grid.
_Avoid_: transposed view, comparison view, row detail view

**Editable Result**:
A query result whose cells can be edited in place to trigger an UPDATE against the underlying row. Applies only to a single-table SELECT (no JOIN, subquery, GROUP BY, DISTINCT, or aggregation) whose Base Table has a Primary Key and whose result columns include every Primary Key column. Within an Editable Result, only cells backed by a direct column reference are editable — computed/aliased expressions and the Primary Key column itself stay read-only. Behaves identically in Results Table and Vertical View, regardless of which editor mode produced the SELECT.
_Avoid_: inline edit, editable cell, live edit

**Base Table**:
The single table a SELECT's columns are resolved back to, used to determine whether a result is an Editable Result and to target its UPDATEs. Determined by parsing the SQL and cross-checking against the driver's per-column table metadata; queries with JOINs or subqueries have no Base Table.
_Avoid_: source table, target table

**Row Limit**:
A default `LIMIT 100` the backend injects into SELECT queries that don't already include a LIMIT clause. If the query has an explicit LIMIT (from Builder or Script Mode), that value is used as-is. Does not apply to UPDATE.
_Avoid_: result limit, page size

**JSON Column**:
A result column whose Base Table declares a native JSON type (`json`/`jsonb` in PostgreSQL, `JSON` in MySQL), detected from the DB's declared column type rather than by inspecting cell contents. Clicking a cell in a JSON Column opens a formatted-JSON modal instead of the inline single-line editor used for other columns — editable when the cell is editable per Editable Result rules, read-only otherwise.
_Avoid_: JSON field, JSON cell, structured column

**Loaded Query**:
The Saved Query the Script Buffer is currently tied to. A Saved Query becomes the Loaded Query when it is loaded from the saved list or just after a new one is saved. It stops being the Loaded Query when another Saved Query is loaded, a table is tapped in the Table Explorer, the Active Connection changes, or the Saved Query is deleted. Saving while a Loaded Query exists overwrites it; saving with none creates a new Saved Query.
_Avoid_: current query, open query, active query

**MCP-Exposed Connection**:
A Connection the user has explicitly opted in to make queryable by external AI agents through the MCP endpoint. Off by default for every Connection, including pre-existing ones. The user toggles exposure for all Connections from a single checklist dialog, not from each Connection's own form. Agents can only see and query MCP-Exposed Connections.
_Avoid_: shared connection, public connection, enabled connection

**MCP Access**:
The read-only channel through which external AI agents list MCP-Exposed Connections, read their schema, and run SELECT queries. The agent writes the SQL itself; BrickSQL does not translate natural language on this channel. Authenticated by a dedicated static token, separate from Auth Credentials; absent token means MCP Access is disabled. Never permits statements other than a single SELECT.
_Avoid_: MCP mode, agent API, AI integration

**Result Snapshot**:
The full result set of an MCP Access SELECT that returned more rows than the agent receives inline, kept temporarily on the server so the user can open it in the browser. Meant for the human, not the agent: the agent only receives the first rows, the total row count, and a link. Viewed with the same Results Table as any other result, behind the normal login — the MCP token does not grant access to it.
_Avoid_: export, result file, temp file, dump

**Proposed Query**:
A SELECT an agent hands to the user through MCP Access instead of running it. Validated like any MCP Access query but never executed: it reaches the user as a link that opens the Workspace with the SQL loaded in the Script Buffer, for the user to review and run. Used when the user wants the query itself rather than its result.
_Avoid_: suggested query, draft query
