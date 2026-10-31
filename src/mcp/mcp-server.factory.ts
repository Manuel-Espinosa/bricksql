import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { McpAccessService, McpToolError } from './mcp-access.service';

type ToolResult = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

const json = (value: unknown) =>
  JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));

const ok = (value: unknown): ToolResult => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : json(value) }],
});

async function guarded(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof McpToolError) {
      return { isError: true, content: [{ type: 'text', text: err.message }] };
    }
    return {
      isError: true,
      content: [{ type: 'text', text: 'Internal error while running the tool.' }],
    };
  }
}

/** Builds the MCP server (the read-only tools) for a single stateless request. */
@Injectable()
export class McpServerFactory {
  constructor(private readonly access: McpAccessService) {}

  create(baseUrl: string): McpServer {
    const server = new McpServer({ name: 'bricksql', version: '1.0.0' });
    const connection = z
      .string()
      .describe('Connection id or name, as returned by list_connections');

    server.registerTool(
      'list_connections',
      {
        description:
          'List the database connections available for querying (MySQL/PostgreSQL). Start here.',
      },
      () => guarded(() => this.access.listConnections()),
    );

    server.registerTool(
      'list_tables',
      {
        description:
          'List the table names of a connection. Follow with describe_tables for the columns you need.',
        inputSchema: { connection },
      },
      ({ connection }) => guarded(() => this.access.listTables(connection)),
    );

    server.registerTool(
      'describe_tables',
      {
        description:
          'Get the schema (CREATE TABLE DDL with column types, nullability and primary keys) of specific tables. Ask only for the tables you need.',
        inputSchema: {
          connection,
          tables: z.array(z.string()).min(1).max(30).describe('Table names from list_tables'),
        },
      },
      ({ connection, tables }) =>
        guarded(() => this.access.describeTables(connection, tables)),
    );

    server.registerTool(
      'run_select',
      {
        description:
          'Run ONE read-only SELECT statement written in the connection\'s SQL dialect (MySQL or PostgreSQL). Writes are impossible. ' +
          'Returns columns and the first 100 rows; if there are more, the user can open the full result via resultSnapshotUrl. ' +
          'Prefer filters/aggregates over SELECT *.',
        inputSchema: {
          connection,
          sql: z.string().min(1).max(20_000).describe('A single SELECT statement'),
        },
      },
      ({ connection, sql }) =>
        guarded(() => this.access.runSelect(connection, sql, baseUrl)),
    );

    server.registerTool(
      'propose_query',
      {
        description:
          'Do NOT run a query; hand it to the user instead. Validates one SELECT and returns a link that opens BrickSQL with the SQL loaded in the editor, un-executed, for the user to review and run themselves. ' +
          'Use it when the user asks for the query rather than its result, or for heavy/sensitive queries they should run on their own.',
        inputSchema: {
          connection,
          sql: z.string().min(1).max(20_000).describe('A single SELECT statement'),
        },
      },
      ({ connection, sql }) =>
        guarded(() => this.access.proposeQuery(connection, sql, baseUrl)),
    );

    return server;
  }
}
