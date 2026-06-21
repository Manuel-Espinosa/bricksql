import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly username: string;
  private readonly password: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.username = config.getOrThrow<string>('BRICKSQL_USER');
    this.password = config.getOrThrow<string>('BRICKSQL_PASSWORD');
  }

  login(username: string, password: string): { accessToken: string } {
    if (username !== this.username || password !== this.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: username };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
