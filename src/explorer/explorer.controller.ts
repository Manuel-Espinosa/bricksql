import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExplorerService } from './explorer.service';

@UseGuards(JwtAuthGuard)
@Controller('connections/:connectionId/explorer')
export class ExplorerController {
  constructor(private readonly explorerService: ExplorerService) {}

  @Get('databases')
  listDatabases(@Param('connectionId') connectionId: string) {
    return this.explorerService.listDatabases(connectionId);
  }

  @Get('tables')
  listTables(@Param('connectionId') connectionId: string) {
    return this.explorerService.listTables(connectionId);
  }

  @Get('tables/:table')
  describeTable(
    @Param('connectionId') connectionId: string,
    @Param('table') table: string,
  ) {
    return this.explorerService.describeTable(connectionId, table);
  }

  @Get('schema')
  getSchema(@Param('connectionId') connectionId: string) {
    return this.explorerService.getSchema(connectionId);
  }
}
