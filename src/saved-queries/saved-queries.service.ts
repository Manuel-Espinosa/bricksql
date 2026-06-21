import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { StorageService, SavedQueryRecord } from '../storage/storage.service';
import { ConnectionsService } from '../connections/connections.service';
import { CreateSavedQueryDto } from './dto/create-saved-query.dto';
import { UpdateSavedQueryDto } from './dto/update-saved-query.dto';

@Injectable()
export class SavedQueriesService {
  constructor(
    private readonly storage: StorageService,
    private readonly connections: ConnectionsService,
  ) {}

  async findAll(connectionId: string): Promise<SavedQueryRecord[]> {
    await this.connections.findOne(connectionId);
    return this.storage.listSavedQueries(connectionId);
  }

  async findOne(connectionId: string, id: string): Promise<SavedQueryRecord> {
    const queries = await this.storage.listSavedQueries(connectionId);
    const query = queries.find((q) => q.id === id);
    if (!query) throw new NotFoundException(`Saved query ${id} not found`);
    return query;
  }

  async create(
    connectionId: string,
    dto: CreateSavedQueryDto,
  ): Promise<SavedQueryRecord> {
    await this.connections.findOne(connectionId);
    const record: SavedQueryRecord = { id: uuidv4(), connectionId, ...dto };
    await this.storage.saveSavedQuery(record);
    return record;
  }

  async update(
    connectionId: string,
    id: string,
    dto: UpdateSavedQueryDto,
  ): Promise<SavedQueryRecord> {
    const existing = await this.findOne(connectionId, id);
    const updated: SavedQueryRecord = { ...existing, ...dto };
    await this.storage.saveSavedQuery(updated);
    return updated;
  }

  async remove(connectionId: string, id: string): Promise<void> {
    await this.findOne(connectionId, id);
    await this.storage.deleteSavedQuery(connectionId, id);
  }
}
