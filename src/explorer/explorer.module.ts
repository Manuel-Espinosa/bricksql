import { Module } from '@nestjs/common';
import { ExplorerService } from './explorer.service';
import { ExplorerController } from './explorer.controller';
import { ConnectionsModule } from '../connections/connections.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConnectionsModule, DatabaseModule],
  providers: [ExplorerService],
  controllers: [ExplorerController],
})
export class ExplorerModule {}
