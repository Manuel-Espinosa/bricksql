import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateQueryDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsNotEmpty()
  model: string;
}
