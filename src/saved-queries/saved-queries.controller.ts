import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SavedQueriesService } from './saved-queries.service';
import { CreateSavedQueryDto } from './dto/create-saved-query.dto';
import { UpdateSavedQueryDto } from './dto/update-saved-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('connections/:connectionId/saved-queries')
export class SavedQueriesController {
  constructor(private readonly savedQueriesService: SavedQueriesService) {}

  @Get()
  findAll(@Param('connectionId') connectionId: string) {
    return this.savedQueriesService.findAll(connectionId);
  }

  @Get(':id')
  findOne(@Param('connectionId') connectionId: string, @Param('id') id: string) {
    return this.savedQueriesService.findOne(connectionId, id);
  }

  @Post()
  create(
    @Param('connectionId') connectionId: string,
    @Body() dto: CreateSavedQueryDto,
  ) {
    return this.savedQueriesService.create(connectionId, dto);
  }

  @Put(':id')
  update(
    @Param('connectionId') connectionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSavedQueryDto,
  ) {
    return this.savedQueriesService.update(connectionId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('connectionId') connectionId: string, @Param('id') id: string) {
    return this.savedQueriesService.remove(connectionId, id);
  }
}
