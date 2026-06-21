import { Module } from '@nestjs/common';
import { QueryService } from './query.service';
import { QueryController } from './query.controller';
import { ConnectionsModule } from '../connections/connections.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConnectionsModule, DatabaseModule],
  providers: [QueryService],
  controllers: [QueryController],
})
export class QueryModule {}
