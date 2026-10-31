import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConnectionsModule } from '../connections/connections.module';
import { DatabaseModule } from '../database/database.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { McpController } from './mcp.controller';
import { McpSettingsController } from './mcp-settings.controller';
import { McpAccessService } from './mcp-access.service';
import { McpServerFactory } from './mcp-server.factory';
import { McpTokenGuard } from './mcp-token.guard';

@Module({
  imports: [AuthModule, ConnectionsModule, DatabaseModule, SnapshotsModule],
  providers: [McpAccessService, McpServerFactory, McpTokenGuard],
  controllers: [McpController, McpSettingsController],
})
export class McpModule {}
