import { Module } from '@nestjs/common';
import { EditableResultService } from './editable-result.service';
import { EditableResultController } from './editable-result.controller';
import { ConnectionsModule } from '../connections/connections.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConnectionsModule, DatabaseModule],
  providers: [EditableResultService],
  controllers: [EditableResultController],
  exports: [EditableResultService],
})
export class EditableResultModule {}
