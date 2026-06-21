import { Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ConnectionsController } from './connections.controller';
import { StorageModule } from '../storage/storage.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [StorageModule, DatabaseModule],
  providers: [ConnectionsService],
  controllers: [ConnectionsController],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
