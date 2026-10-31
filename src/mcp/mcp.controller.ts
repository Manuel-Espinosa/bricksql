import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { McpTokenGuard } from './mcp-token.guard';
import { McpServerFactory } from './mcp-server.factory';

/** Streamable HTTP MCP endpoint, stateless: one server+transport per request. */
@UseGuards(McpTokenGuard)
@Controller('mcp')
export class McpController {
  constructor(
    private readonly factory: McpServerFactory,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
  ): Promise<void> {
    const server = this.factory.create(this.baseUrl(req));
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  }

  // Stateless mode has no server-initiated stream and no sessions to end.
  @Get()
  @Delete()
  methodNotAllowed(@Res() res: Response): void {
    res
      .status(405)
      .set('Allow', 'POST')
      .json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      });
  }

  private baseUrl(req: Request): string {
    const configured = this.config.get<string>('BRICKSQL_PUBLIC_URL');
    if (configured) return configured.replace(/\/+$/, '');
    return `${req.protocol}://${req.get('host')}`;
  }
}
