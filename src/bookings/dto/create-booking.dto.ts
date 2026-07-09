import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { NotInPast } from '../validators/not-in-past.validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MaxLength(150)
  customerName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  customerEmail: string;

  @ApiProperty({ example: '+15551234567' })
  @IsString()
  @MaxLength(30)
  customerPhone: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({
    example: '2026-08-01',
    description: 'YYYY-MM-DD; not in the past.',
  })
  @IsDateString()
  @NotInPast()
  bookingDate: string;

  @ApiProperty({ example: '14:30', description: 'HH:mm 24-hour time.' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'bookingTime must be in HH:mm 24-hour format',
  })
  bookingTime: string;

  @ApiPropertyOptional({ example: 'Please call on arrival.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
