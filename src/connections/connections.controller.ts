import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';

@UseGuards(JwtAuthGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get()
  findAll() {
    return this.connectionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.connectionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateConnectionDto) {
    return this.connectionsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConnectionDto) {
    return this.connectionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.connectionsService.remove(id);
  }

  @Post('test')
  testPayload(@Body() dto: CreateConnectionDto) {
    return this.connectionsService.testPayload(dto);
  }

  @Post(':id/test')
  testConnection(@Param('id') id: string) {
    return this.connectionsService.testConnection(id);
  }

  @Patch(':id/database')
  setDatabase(@Param('id') id: string, @Body('database') database: string) {
    return this.connectionsService.updateDatabase(id, database);
  }
}
