import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { ConnectionsModule } from './connections/connections.module';
import { DatabaseModule } from './database/database.module';
import { ExplorerModule } from './explorer/explorer.module';
import { QueryModule } from './query/query.module';
import { SavedQueriesModule } from './saved-queries/saved-queries.module';
import { StorageModule } from './storage/storage.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ...(process.env.NODE_ENV === 'production'
      ? [
          ServeStaticModule.forRoot({
            rootPath: join(__dirname, 'public'),
            exclude: ['/api/{*path}'],
          }),
        ]
      : []),
    StorageModule,
    AuthModule,
    ConnectionsModule,
    DatabaseModule,
    ExplorerModule,
    QueryModule,
    SavedQueriesModule,
    AiModule,
  ],
})
export class AppModule {}
