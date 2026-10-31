import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Authenticates MCP Access with the dedicated BRICKSQL_MCP_TOKEN bearer token. */
@Injectable()
export class McpTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const token = this.config.get<string>('BRICKSQL_MCP_TOKEN');
    if (!token) throw new NotFoundException('MCP Access is disabled');

    const header = context.switchToHttp().getRequest<Request>().headers
      .authorization;
    const provided = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (!timingSafeEqual(digest(provided), digest(token))) {
      throw new UnauthorizedException('Invalid MCP token');
    }
    return true;
  }
}
