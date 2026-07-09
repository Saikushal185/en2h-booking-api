import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Haircut' })
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiProperty({ example: 'A professional haircut and styling session.' })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ example: 30, description: 'Duration in minutes.' })
  @IsInt()
  @IsPositive()
  duration: number;

  @ApiProperty({ example: 49.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
