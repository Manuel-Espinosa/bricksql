import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EditableResultService } from './editable-result.service';
import type { ConnectionsService } from '../connections/connections.service';
import type { DatabaseService } from '../database/database.service';
import type { ConnectionRecord } from '../storage/storage.service';
import type { TableColumn } from '../database/adapters/database-adapter.interface';

describe('EditableResultService', () => {
  const connectionRecord: ConnectionRecord = {
    id: 'c1',
    name: 'test',
    engine: 'mysql',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'secret',
    database: 'db1',
  };

  const usersColumns: TableColumn[] = [
    { name: 'id', type: 'int', nullable: false, primaryKey: true },
    { name: 'name', type: 'varchar', nullable: true, primaryKey: false },
    { name: 'email', type: 'varchar', nullable: false, primaryKey: false },
  ];

  function buildService(columns: TableColumn[], updateRowResult = 1) {
    const adapter = {
      describeTable: jest.fn().mockResolvedValue(columns),
      updateRow: jest.fn().mockResolvedValue(updateRowResult),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const connections = {
      findOne: jest.fn().mockResolvedValue(connectionRecord),
    } as unknown as ConnectionsService;
    const database = {
      createAdapter: jest.fn().mockReturnValue(adapter),
    } as unknown as DatabaseService;
    const service = new EditableResultService(connections, database);
    return { service, adapter };
  }

  it('updates a valid non-PK, nullable-respecting column', async () => {
    const { service, adapter } = buildService(usersColumns);
    const result = await service.updateCell('c1', {
      table: 'users',
      primaryKey: [{ column: 'id', value: 1 }],
      column: 'name',
      value: 'Ada',
    });
    expect(result).toEqual({ affectedRows: 1 });
    expect(adapter.updateRow).toHaveBeenCalledWith(
      'users',
      [{ column: 'id', value: 1 }],
      'name',
      'Ada',
    );
    expect(adapter.close).toHaveBeenCalled();
  });

  it('rejects editing the primary key column', async () => {
    const { service } = buildService(usersColumns);
    await expect(
      service.updateCell('c1', {
        table: 'users',
        primaryKey: [{ column: 'id', value: 1 }],
        column: 'id',
        value: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown column', async () => {
    const { service } = buildService(usersColumns);
    await expect(
      service.updateCell('c1', {
        table: 'users',
        primaryKey: [{ column: 'id', value: 1 }],
        column: 'nope',
        value: 'x',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a table with no primary key', async () => {
    const noPk = usersColumns.map((c) => ({ ...c, primaryKey: false }));
    const { service } = buildService(noPk);
    await expect(
      service.updateCell('c1', {
        table: 'users',
        primaryKey: [{ column: 'id', value: 1 }],
        column: 'name',
        value: 'x',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a primary key set that does not match the table', async () => {
    const { service } = buildService(usersColumns);
    await expect(
      service.updateCell('c1', {
        table: 'users',
        primaryKey: [{ column: 'email', value: 'a@b.com' }],
        column: 'name',
        value: 'x',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects NULL on a non-nullable column', async () => {
    const { service } = buildService(usersColumns);
    await expect(
      service.updateCell('c1', {
        table: 'users',
        primaryKey: [{ column: 'id', value: 1 }],
        column: 'email',
        value: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows NULL on a nullable column', async () => {
    const { service } = buildService(usersColumns);
    const result = await service.updateCell('c1', {
      table: 'users',
      primaryKey: [{ column: 'id', value: 1 }],
      column: 'name',
      value: null,
    });
    expect(result).toEqual({ affectedRows: 1 });
  });

  it('throws NotFoundException when no row matches the primary key', async () => {
    const { service } = buildService(usersColumns, 0);
    await expect(
      service.updateCell('c1', {
        table: 'users',
        primaryKey: [{ column: 'id', value: 999 }],
        column: 'name',
        value: 'x',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an unknown table', async () => {
    const { service } = buildService([]);
    await expect(
      service.updateCell('c1', {
        table: 'ghost',
        primaryKey: [{ column: 'id', value: 1 }],
        column: 'name',
        value: 'x',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
