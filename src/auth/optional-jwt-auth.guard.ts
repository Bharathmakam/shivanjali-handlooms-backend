import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: unknown,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser | null {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    const hasAuthorizationHeader = Boolean(request.headers.authorization);

    if (err) {
      throw err;
    }

    if (!user && hasAuthorizationHeader) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return user || null;
  }
}
