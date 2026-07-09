import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      service: 'en2h-booking-api',
      timestamp: new Date().toISOString(),
    };
  }
}
