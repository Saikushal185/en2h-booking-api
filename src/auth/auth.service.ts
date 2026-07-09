import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string): Promise<AuthTokens> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email is already registered.');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.usersService.create(email, passwordHash);
    return this.issueTokens(user);
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    return this.issueTokens(user);
  }

  /**
   * Rotates tokens: verifies the presented refresh token against the stored
   * hash, then issues a fresh pair and persists the new refresh hash.
   */
  async refresh(userId: string, presentedToken: string): Promise<AuthTokens> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token is no longer valid.');
    }
    const matches = await bcrypt.compare(
      this.digest(presentedToken),
      user.refreshTokenHash,
    );
    if (!matches) {
      throw new UnauthorizedException('Refresh token is no longer valid.');
    }
    return this.issueTokens(user);
  }

  /**
   * SHA-256 digest of a token before bcrypt. bcrypt only hashes the first 72
   * bytes, and two JWTs for the same user share an identical 72-byte prefix
   * (header + `sub`); digesting first preserves full-token entropy so token
   * rotation and revocation actually take effect.
   */
  private digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const accessOptions: JwtSignOptions = {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.getOrThrow<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    };
    const refreshOptions: JwtSignOptions = {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.getOrThrow<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    };

    const accessToken = await this.jwtService.signAsync(payload, accessOptions);
    const refreshToken = await this.jwtService.signAsync(
      payload,
      refreshOptions,
    );

    const refreshTokenHash = await bcrypt.hash(
      this.digest(refreshToken),
      BCRYPT_ROUNDS,
    );
    await this.usersService.setRefreshTokenHash(user.id, refreshTokenHash);

    return { accessToken, refreshToken };
  }
}
