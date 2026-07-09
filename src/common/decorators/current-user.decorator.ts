import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Extracts the authenticated user (populated by JwtStrategy.validate) from the
 * request. Usage: `@CurrentUser() user: AuthUser`.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
