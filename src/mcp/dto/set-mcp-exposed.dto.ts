import { IsBoolean } from 'class-validator';

export class SetMcpExposedDto {
  @IsBoolean()
  exposed: boolean;
}
