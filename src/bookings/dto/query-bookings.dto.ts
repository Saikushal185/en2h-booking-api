import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { BookingStatus } from '../enums/booking-status.enum';

export class QueryBookingsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: BookingStatus,
    description: 'Filter by status.',
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Case-insensitive search on customer name or email.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;
}
