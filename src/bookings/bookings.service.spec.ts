import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { Booking } from './booking.entity';
import { BookingStatus } from './enums/booking-status.enum';
import { Service } from '../services/service.entity';
import { ServicesService } from '../services/services.service';
import { CreateBookingDto } from './dto/create-booking.dto';

/**
 * Unit tests for the booking business rules. The repository and the
 * ServicesService are mocked so these run without a database.
 */
describe('BookingsService (business rules)', () => {
  let service: BookingsService;

  const repo = {
    findOne: jest.fn<Promise<Booking | null>, unknown[]>(),
    create: jest.fn((x: Partial<Booking>) => x as Booking),
    save: jest.fn((x: Booking) => Promise.resolve(x)),
  };
  const servicesService = {
    findOne: jest.fn<Promise<Service>, unknown[]>(),
  };

  const baseDto: CreateBookingDto = {
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+15551234567',
    serviceId: 'service-1',
    bookingDate: '2999-01-01',
    bookingTime: '10:00',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: repo },
        { provide: ServicesService, useValue: servicesService },
      ],
    }).compile();

    service = module.get(BookingsService);
  });

  describe('create', () => {
    it('throws NotFound when the service does not exist', async () => {
      servicesService.findOne.mockRejectedValue(new NotFoundException());
      await expect(service.create(baseDto)).rejects.toThrow(NotFoundException);
    });

    it('throws Conflict when an active booking already occupies the slot', async () => {
      servicesService.findOne.mockResolvedValue({} as Service);
      repo.findOne.mockResolvedValue({ id: 'existing' } as Booking);
      await expect(service.create(baseDto)).rejects.toThrow(ConflictException);
    });

    it('creates a PENDING booking on the happy path', async () => {
      servicesService.findOne.mockResolvedValue({} as Service);
      repo.findOne.mockResolvedValue(null);
      const result = await service.create(baseDto);
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('rejects transitioning a CANCELLED booking to COMPLETED', async () => {
      repo.findOne.mockResolvedValue({
        id: 'b1',
        status: BookingStatus.CANCELLED,
      } as Booking);
      await expect(
        service.updateStatus('b1', BookingStatus.COMPLETED),
      ).rejects.toThrow(ConflictException);
    });

    it('allows PENDING -> CONFIRMED', async () => {
      repo.findOne.mockResolvedValue({
        id: 'b1',
        status: BookingStatus.PENDING,
      } as Booking);
      const result = await service.updateStatus('b1', BookingStatus.CONFIRMED);
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  describe('cancel', () => {
    it('rejects cancelling a COMPLETED booking', async () => {
      repo.findOne.mockResolvedValue({
        id: 'b1',
        status: BookingStatus.COMPLETED,
      } as Booking);
      await expect(service.cancel('b1')).rejects.toThrow(BadRequestException);
    });

    it('cancels an active booking', async () => {
      repo.findOne.mockResolvedValue({
        id: 'b1',
        status: BookingStatus.PENDING,
      } as Booking);
      const result = await service.cancel('b1');
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });
  });
});
