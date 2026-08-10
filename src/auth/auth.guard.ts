// src/guards/auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
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
    if (!apiKey) throw new UnauthorizedException('Unauthorized access');
    // console.log('api key is ', apiKey);
    if (apiKey) {
      const [_, token] = apiKey.split('Bearer ');
      // console.log('type ', token);
      if (!token) {
        throw new UnauthorizedException('Invalid authorization format');
      }
      const { id, email, role, companyId, branchId } =
        await this.verifyAccessToken(token);
      request.user = { id, email, role, companyId, branchId };

      return true;
    }

    throw new UnauthorizedException('Unauthorized access');
  }
  async verifyAccessToken(token: string) {
    try {
      // decode and verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWTSECRET,
      });

      // destructure the payload
      const { id, email, phone, role, companyId, branchId } = payload;

      console.log('🎫 User ID:', id);
      console.log('📧 Email:', email);
      console.log('📱 Phone:', phone);
      console.log('👤 Role:', role);
      console.log('🧚 companyId: ', companyId);

      return { id, email, phone, role, companyId, branchId };
    } catch (err) {
      // console.log('err', err);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
