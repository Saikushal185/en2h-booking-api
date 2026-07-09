import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { Booking } from './booking.entity';
import { BookingStatus } from './enums/booking-status.enum';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { ServicesService } from '../services/services.service';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

/**
 * Allowed status transitions. CANCELLED and COMPLETED are terminal, which is
 * what enforces the "cancelled booking cannot be marked completed" rule.
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.COMPLETED]: [],
};

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    private readonly servicesService: ServicesService,
  ) {}

  async create(dto: CreateBookingDto): Promise<Booking> {
    // Rule: a booking must reference an existing service (404 otherwise).
    await this.servicesService.findOne(dto.serviceId);

    // Rule (bonus): no duplicate active booking for the same slot.
    const clash = await this.bookingsRepository.findOne({
      where: {
        serviceId: dto.serviceId,
        bookingDate: dto.bookingDate,
        bookingTime: dto.bookingTime,
        status: Not(BookingStatus.CANCELLED),
      },
    });
    if (clash) {
      throw new ConflictException(
        'This service is already booked for the selected date and time.',
      );
    }

    const booking = this.bookingsRepository.create({
      ...dto,
      notes: dto.notes ?? null,
      status: BookingStatus.PENDING,
    });
    return this.bookingsRepository.save(booking);
  }

  async findAll(query: QueryBookingsDto): Promise<PaginatedResponse<Booking>> {
    const baseWhere = query.status ? { status: query.status } : {};

    // Search matches customer name OR email; combine with the status filter.
    const where = query.search
      ? [
          { ...baseWhere, customerName: ILike(`%${query.search}%`) },
          { ...baseWhere, customerEmail: ILike(`%${query.search}%`) },
        ]
      : baseWhere;

    const [data, total] = await this.bookingsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });

    return new PaginatedResponse(data, total, query.page, query.limit);
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: { service: true },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found.`);
    }
    return booking;
  }

  async updateStatus(id: string, next: BookingStatus): Promise<Booking> {
    const booking = await this.findOne(id);

    if (booking.status === next) {
      return booking;
    }

    if (!ALLOWED_TRANSITIONS[booking.status].includes(next)) {
      throw new ConflictException(
        `Cannot change booking status from ${booking.status} to ${next}.`,
      );
    }

    booking.status = next;
    return this.bookingsRepository.save(booking);
  }

  async cancel(id: string): Promise<Booking> {
    const booking = await this.findOne(id);

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('A completed booking cannot be cancelled.');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      return booking;
    }

    booking.status = BookingStatus.CANCELLED;
    return this.bookingsRepository.save(booking);
  }
}
