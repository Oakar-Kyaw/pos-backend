// src/guards/auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from 'src/utils/public';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // 💡 See this condition
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['authorization']; // Access header value
    if (!apiKey) throw new ForbiddenException('Unauthorized access');

    if (apiKey) {
      const [_, token] = apiKey.split('Bearer ');
      // console.log('type ', token);
      if (!token) {
        throw new ForbiddenException('Invalid authorization format');
      }
      const { id, email, role } = await this.verifyAccessToken(token);
      request.user = { id, email, role };

      return true;
    }

    throw new ForbiddenException('Unauthorized access');
  }
  async verifyAccessToken(token: string) {
    try {
      // decode and verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWTSECRET,
      });

      // destructure the payload
      const { id, email, phone, role } = payload;

      console.log('🎫 User ID:', id);
      console.log('📧 Email:', email);
      console.log('📱 Phone:', phone);
      console.log('👤 Role:', role);

      return { id, email, phone, role };
    } catch (err) {
      throw new ForbiddenException('Invalid token');
    }
  }
}
