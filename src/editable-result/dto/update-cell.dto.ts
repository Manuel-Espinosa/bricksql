import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PrimaryKeyEntryDto {
  @IsString()
  @IsNotEmpty()
  column: string;

  @Allow()
  value: unknown;
}

export class UpdateCellDto {
  @IsString()
  @IsNotEmpty()
  table: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrimaryKeyEntryDto)
  primaryKey: PrimaryKeyEntryDto[];

  @IsString()
  @IsNotEmpty()
  column: string;

  @Allow()
  value: unknown;
}
