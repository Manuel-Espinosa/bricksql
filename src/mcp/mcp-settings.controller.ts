import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectionsService } from '../connections/connections.service';
import { SetMcpExposedDto } from './dto/set-mcp-exposed.dto';

/** UI-facing (JWT) management of which Connections are MCP-Exposed. */
@UseGuards(JwtAuthGuard)
@Controller('mcp-settings')
export class McpSettingsController {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async get() {
    const all = await this.connections.findAll();
    return {
      enabled: Boolean(this.config.get<string>('BRICKSQL_MCP_TOKEN')),
      publicUrl:
        this.config.get<string>('BRICKSQL_PUBLIC_URL')?.replace(/\/+$/, '') ??
        null,
      connections: all.map((c) => ({
        id: c.id,
        name: c.name,
        engine: c.engine,
        database: c.database ?? null,
        mcpExposed: Boolean(c.mcpExposed),
      })),
    };
  }

  @Put('connections/:id')
  async setExposed(@Param('id') id: string, @Body() dto: SetMcpExposedDto) {
    const updated = await this.connections.setMcpExposed(id, dto.exposed);
    return { id: updated.id, mcpExposed: Boolean(updated.mcpExposed) };
  }
}
