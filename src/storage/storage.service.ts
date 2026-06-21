import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ConnectionRecord {
  id: string;
  name: string;
  engine: 'mysql' | 'postgres';
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
}

export interface SavedQueryRecord {
  id: string;
  connectionId: string;
  name: string;
  sql: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private dataDir: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.dataDir = this.config.get<string>('DATA_DIR') ?? './data';
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  private connectionDir(id: string): string {
    return path.join(this.dataDir, id);
  }

  private connectionFile(id: string): string {
    return path.join(this.connectionDir(id), 'connection.json');
  }

  private queriesFile(id: string): string {
    return path.join(this.connectionDir(id), 'queries.json');
  }

  async listConnections(): Promise<ConnectionRecord[]> {
    let entries: string[];
    try {
      entries = await fs.readdir(this.dataDir);
    } catch {
      return [];
    }
    const results: ConnectionRecord[] = [];
    for (const entry of entries) {
      try {
        const raw = await fs.readFile(
          path.join(this.dataDir, entry, 'connection.json'),
          'utf-8',
        );
        results.push(JSON.parse(raw) as ConnectionRecord);
      } catch {
        // skip malformed entries
      }
    }
    return results;
  }

  async getConnection(id: string): Promise<ConnectionRecord | null> {
    try {
      const raw = await fs.readFile(this.connectionFile(id), 'utf-8');
      return JSON.parse(raw) as ConnectionRecord;
    } catch {
      return null;
    }
  }

  async saveConnection(conn: ConnectionRecord): Promise<void> {
    await fs.mkdir(this.connectionDir(conn.id), { recursive: true });
    await fs.writeFile(this.connectionFile(conn.id), JSON.stringify(conn, null, 2));
  }

  async deleteConnection(id: string): Promise<void> {
    await fs.rm(this.connectionDir(id), { recursive: true, force: true });
  }

  async listSavedQueries(connectionId: string): Promise<SavedQueryRecord[]> {
    try {
      const raw = await fs.readFile(this.queriesFile(connectionId), 'utf-8');
      return JSON.parse(raw) as SavedQueryRecord[];
    } catch {
      return [];
    }
  }

  async saveSavedQuery(query: SavedQueryRecord): Promise<void> {
    await fs.mkdir(this.connectionDir(query.connectionId), { recursive: true });
    const queries = await this.listSavedQueries(query.connectionId);
    const idx = queries.findIndex((q) => q.id === query.id);
    if (idx >= 0) {
      queries[idx] = query;
    } else {
      queries.push(query);
    }
    await fs.writeFile(
      this.queriesFile(query.connectionId),
      JSON.stringify(queries, null, 2),
    );
  }

  async deleteSavedQuery(connectionId: string, queryId: string): Promise<void> {
    const queries = await this.listSavedQueries(connectionId);
    const filtered = queries.filter((q) => q.id !== queryId);
    await fs.writeFile(
      this.queriesFile(connectionId),
      JSON.stringify(filtered, null, 2),
    );
  }
}
