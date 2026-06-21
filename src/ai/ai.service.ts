import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExplorerService } from '../explorer/explorer.service';
import { ConnectionsService } from '../connections/connections.service';

interface OllamaChatResponse {
  message: { role: string; content: string };
}

interface OllamaTagsResponse {
  models: { name: string }[];
}

@Injectable()
export class AiService {
  private readonly ollamaUrl: string;

  constructor(
    private readonly explorer: ExplorerService,
    private readonly connections: ConnectionsService,
    private readonly config: ConfigService,
  ) {
    this.ollamaUrl = this.config.get<string>('OLLAMA_URL', 'http://host.docker.internal:11434');
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.ollamaUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama unreachable: ${response.status}`);
    }
    const data = (await response.json()) as OllamaTagsResponse;
    return data.models.map((m) => m.name);
  }

  async generateQuery(
    connectionId: string,
    userPrompt: string,
    model: string,
  ): Promise<string> {
    const conn = await this.connections.findOne(connectionId);
    const ddl = await this.buildSchemaDdl(connectionId);
    const systemPrompt = this.buildSystemPrompt(ddl, conn.engine);

    const response = await fetch(`${this.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    return this.cleanSql(data.message.content);
  }

  private async buildSchemaDdl(connectionId: string): Promise<string> {
    const tables = await this.explorer.listTables(connectionId);
    const ddlStatements = await Promise.all(
      tables.map(async (table) => {
        const columns = await this.explorer.describeTable(connectionId, table);
        const columnDefs = columns
          .map((col) => `  ${col.name} ${col.type} ${col.nullable ? 'NULL' : 'NOT NULL'}`)
          .join(',\n');
        return `CREATE TABLE ${table} (\n${columnDefs}\n);`;
      }),
    );
    return ddlStatements.join('\n\n');
  }

  private cleanSql(raw: string): string {
    return raw
      .replace(/^```(?:sql)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()
      .replace(/;$/, '');
  }

  private buildSystemPrompt(ddl: string, engine: string): string {
    const dialect = engine === 'postgres' ? 'PostgreSQL' : 'MySQL';
    return `You are a ${dialect} expert. Generate a single SELECT SQL query that answers the user's request.

Rules:
- Use only ${dialect} syntax and functions.
- Return ONLY the SQL query, nothing else.
- No markdown, no code blocks, no explanations.
- Only SELECT statements — no INSERT, UPDATE, DELETE, or DDL.
- If the user provides examples of column contents, JSON structures, or sample data, use them to write a more accurate query (e.g. to infer JSON field paths or implicit relationships).

Database schema (${dialect}):
${ddl}`;
  }
}
