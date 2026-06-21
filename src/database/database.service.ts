import { Injectable, BadRequestException } from '@nestjs/common';
import { ConnectionRecord } from '../storage/storage.service';
import { DatabaseAdapter } from './adapters/database-adapter.interface';
import { MysqlAdapter } from './adapters/mysql.adapter';
import { PostgresAdapter } from './adapters/postgres.adapter';

@Injectable()
export class DatabaseService {
  createAdapter(connection: ConnectionRecord): DatabaseAdapter {
    if (connection.engine === 'mysql') {
      return new MysqlAdapter(connection);
    }
    if (connection.engine === 'postgres') {
      return new PostgresAdapter(connection);
    }
    throw new BadRequestException(`Unsupported engine: ${connection.engine}`);
  }
}
