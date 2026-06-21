import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { StorageService, ConnectionRecord } from '../storage/storage.service';
import { DatabaseService } from '../database/database.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly storage: StorageService,
    private readonly database: DatabaseService,
  ) {}

  async findAll(): Promise<ConnectionRecord[]> {
    return this.storage.listConnections();
  }

  async findOne(id: string): Promise<ConnectionRecord> {
    const conn = await this.storage.getConnection(id);
    if (!conn) throw new NotFoundException(`Connection ${id} not found`);
    return conn;
  }

  async create(dto: CreateConnectionDto): Promise<ConnectionRecord> {
    const record: ConnectionRecord = { id: uuidv4(), ...dto };
    await this.storage.saveConnection(record);
    return record;
  }

  async update(id: string, dto: UpdateConnectionDto): Promise<ConnectionRecord> {
    const existing = await this.findOne(id);
    const updated: ConnectionRecord = { ...existing, ...dto };
    await this.storage.saveConnection(updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.storage.deleteConnection(id);
  }

  async testConnection(id: string): Promise<{ ok: boolean; message?: string }> {
    const conn = await this.findOne(id);
    return this.testAdapter(conn);
  }

  async testPayload(
    dto: CreateConnectionDto,
  ): Promise<{ ok: boolean; message?: string }> {
    return this.testAdapter({ id: '', ...dto });
  }

  private async testAdapter(
    conn: ConnectionRecord,
  ): Promise<{ ok: boolean; message?: string }> {
    const adapter = this.database.createAdapter(conn);
    try {
      await adapter.testConnection();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    } finally {
      await adapter.close();
    }
  }

  async updateDatabase(id: string, database: string): Promise<ConnectionRecord> {
    return this.update(id, { database });
  }
}
