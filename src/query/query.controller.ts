import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryService } from './query.service';
import { ExecuteQueryDto } from './dto/execute-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('connections/:connectionId/query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post()
  execute(
    @Param('connectionId') connectionId: string,
    @Body() dto: ExecuteQueryDto,
  ) {
    return this.queryService.execute(connectionId, dto.sql);
  }
}
