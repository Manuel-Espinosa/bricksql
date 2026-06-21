import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ConnectionsModule } from './connections/connections.module';
import { DatabaseModule } from './database/database.module';
import { ExplorerModule } from './explorer/explorer.module';
import { QueryModule } from './query/query.module';
import { SavedQueriesModule } from './saved-queries/saved-queries.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StorageModule,
    AuthModule,
    ConnectionsModule,
    DatabaseModule,
    ExplorerModule,
    QueryModule,
    SavedQueriesModule,
  ],
})
export class AppModule {}
