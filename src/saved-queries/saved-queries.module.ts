import { Module } from '@nestjs/common';
import { SavedQueriesService } from './saved-queries.service';
import { SavedQueriesController } from './saved-queries.controller';
import { StorageModule } from '../storage/storage.module';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
  imports: [StorageModule, ConnectionsModule],
  providers: [SavedQueriesService],
  controllers: [SavedQueriesController],
})
export class SavedQueriesModule {}
