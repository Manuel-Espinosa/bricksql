import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ExplorerModule } from '../explorer/explorer.module';

@Module({
  imports: [ExplorerModule],
  providers: [AiService],
  controllers: [AiController],
})
export class AiModule {}
