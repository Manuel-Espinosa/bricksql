import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExplorerService } from '../explorer/explorer.service';

interface OllamaChatResponse {
  message: { role: string; content: string };
}

@Injectable()
export class AiService {
  private readonly ollamaUrl: string;
  private readonly defaultModel: string;

  constructor(
    private readonly explorer: ExplorerService,
    private readonly config: ConfigService,
  ) {
    this.ollamaUrl = this.config.get<string>('OLLAMA_URL', 'http://host.docker.internal:11434');
    this.defaultModel = this.config.get<string>('OLLAMA_MODEL', 'llama3');
  }

  async generateQuery(
    connectionId: string,
    userPrompt: string,
    model?: string,
  ): Promise<string> {
    const ddl = await this.buildSchemaDdl(connectionId);
    const systemPrompt = this.buildSystemPrompt(ddl);
    const targetModel = model ?? this.defaultModel;

    const response = await fetch(`${this.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: targetModel,
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
    return data.message.content.trim();
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

  private buildSystemPrompt(ddl: string): string {
    return `You are a SQL expert. Generate a single SELECT SQL query that answers the user's request.
Rules:
- Return ONLY the SQL query, nothing else.
- No markdown, no code blocks, no explanations.
- Only SELECT statements — no INSERT, UPDATE, DELETE, or DDL.

Database schema:
${ddl}`;
  }
}
