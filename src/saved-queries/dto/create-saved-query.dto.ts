import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateSavedQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  sql: string;
}
