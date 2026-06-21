import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class GenerateQueryDto {
  prompt: string;
  model: string;
}

@UseGuards(JwtAuthGuard)
@Controller('api/ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('models')
  async models(): Promise<{ models: string[] }> {
    const models = await this.ai.listModels();
    return { models };
  }

  @Post(':connectionId/generate')
  async generate(
    @Param('connectionId') connectionId: string,
    @Body() body: GenerateQueryDto,
  ): Promise<{ sql: string }> {
    const sql = await this.ai.generateQuery(connectionId, body.prompt, body.model);
    return { sql };
  }
}
