import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { QueryResult } from '../database/adapters/database-adapter.interface';

export const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const SNAPSHOT_ID = /^[0-9a-f-]{36}$/i;

export interface ResultSnapshot extends QueryResult {
  id: string;
  connectionName: string;
  sql: string;
  createdAt: string;
  expiresAt: string;
  /** True when the row cap cut the result short — more rows exist in the DB. */
  capped: boolean;
}

@Injectable()
export class SnapshotsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SnapshotsService.name);
  private dir: string;
  private timer?: NodeJS.Timeout;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.dir = path.join(
      this.config.get<string>('DATA_DIR') ?? './data',
      'snapshots',
    );
    await fs.mkdir(this.dir, { recursive: true });
    await this.removeExpired();
    this.timer = setInterval(() => void this.removeExpired(), CLEANUP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async create(
    data: Omit<ResultSnapshot, 'id' | 'createdAt' | 'expiresAt'>,
  ): Promise<ResultSnapshot> {
    const now = Date.now();
    const snapshot: ResultSnapshot = {
      ...data,
      id: randomUUID(),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SNAPSHOT_TTL_MS).toISOString(),
    };
    await fs.writeFile(this.file(snapshot.id), JSON.stringify(snapshot), {
      mode: 0o600,
    });
    return snapshot;
  }

  async get(id: string): Promise<ResultSnapshot> {
    if (!SNAPSHOT_ID.test(id)) throw new NotFoundException('Snapshot not found');
    let snapshot: ResultSnapshot;
    try {
      snapshot = JSON.parse(
        await fs.readFile(this.file(id), 'utf-8'),
      ) as ResultSnapshot;
    } catch {
      throw new NotFoundException('Snapshot not found');
    }
    if (Date.parse(snapshot.expiresAt) <= Date.now()) {
      await fs.rm(this.file(id), { force: true });
      throw new NotFoundException('Snapshot expired');
    }
    return snapshot;
  }

  async removeExpired(): Promise<void> {
    let entries: string[];
    try {
      entries = await fs.readdir(this.dir);
    } catch {
      return;
    }
    const cutoff = Date.now() - SNAPSHOT_TTL_MS;
    for (const entry of entries) {
      const file = path.join(this.dir, entry);
      try {
        const stat = await fs.stat(file);
        if (stat.mtimeMs <= cutoff) await fs.rm(file, { force: true });
      } catch (err) {
        this.logger.warn(`Could not clean ${entry}: ${(err as Error).message}`);
      }
    }
  }

  private file(id: string): string {
    return path.join(this.dir, `${id}.json`);
  }
}
