import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EditableResultService } from './editable-result.service';
import { UpdateCellDto } from './dto/update-cell.dto';

@UseGuards(JwtAuthGuard)
@Controller('connections/:connectionId/cell')
export class EditableResultController {
  constructor(private readonly service: EditableResultService) {}

  @Patch()
  update(
    @Param('connectionId') connectionId: string,
    @Body() dto: UpdateCellDto,
  ) {
    return this.service.updateCell(connectionId, dto);
  }
}
