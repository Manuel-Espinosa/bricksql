import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ExplorerModule } from '../explorer/explorer.module';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
  imports: [ExplorerModule, ConnectionsModule],
  providers: [AiService],
  controllers: [AiController],
})
export class AiModule {}
