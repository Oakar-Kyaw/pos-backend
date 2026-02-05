import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { ConflictException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { lastValueFrom } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import { comparePassword } from 'src/utils/hash-password';

// interface PayloadInterface {
//   id: number;
//   email: string | null;
//   phone: string | null;
// }

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async signIn(datas) {
    if (!datas)
      throw new BadRequestException('Either email or phone must be provided');
    const { email, password, phone } = datas;
    console.log('email and password', email, password);
    if (!email && !phone)
      throw new BadRequestException('Either email or phone must be provided');

    if (!email && !phone) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    const orConditions: any = [];

    if (email) {
      orConditions.push({ email });
    }

    if (phone) {
      orConditions.push({ phone });
    }

    const user = await this.prisma.user.findFirst({
      where: {
        isDeleted: false,
        OR: orConditions,
      },
    });
    if (!user)
      throw new NotFoundException(
        `User with this ${email ? 'email' : 'phone'} Not found`,
      );
    // Enforce single provider per account
    // if (user.provider && user.provider !== 'PASSWORD') {
    //   throw new ConflictException(
    //     `Account registered with ${user.provider}. Use ${user.provider} to log in.`,
    //   );
    // }
    const passwordComparison = await comparePassword(password, user.password);
    if (!passwordComparison)
      throw new UnauthorizedException(`Password was wrong.`);

    const payload = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    console.log('🎫 Generating tokens for user:', user.id);
    const { access_token, refresh_token } = await this.encryptedData(payload);
    return {
      success: true,
      message: 'Login Successful',
      data: payload,
      access_token,
      refresh_token,
    };
  }

  async signOut(authorizationHeader: string, deviceToken?: string) {
    console.log('🚪 Starting logout process');
    console.log(
      '🎫 Authorization header received:',
      authorizationHeader ? 'Yes' : 'No',
    );

    if (!authorizationHeader) {
      throw new BadRequestException('Authorization header is required');
    }

    const tokenParts = authorizationHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      throw new BadRequestException(
        'Invalid authorization header format. Expected: Bearer <token>',
      );
    }

    const token = tokenParts[1];

    if (!token) {
      throw new BadRequestException(
        'Token is missing from authorization header',
      );
    }

    console.log('🎫 Token extracted, adding to blacklist...');

    //   await this.prisma.blacklistToken.create({
    //     data: { token: token },
    //   });

    console.log('✅ Token blacklisted successfully');

    return {
      success: true,
      message: 'Logout Successfully',
    };
  }

  async refreshToken(refreshToken: string) {
    console.log('🔄 Starting token refresh process');
    console.log('🎫 Refresh token received:', refreshToken ? 'Yes' : 'No');

    if (!refreshToken) {
      throw new ForbiddenException('Refresh token is required');
    }

    console.log('🔍 Verifying refresh token...');
    const payload = await this.jwtService.verifyAsync(refreshToken, {
      secret: process.env.JWTSECRET,
    });

    console.log('✅ Token verified successfully');
    console.log('📋 Payload extracted:', {
      id: payload.id,
      email: payload.email,
    });

    console.log('👤 Looking up user by ID:', payload.id);
    // const { success, message, data } = await firstValueFrom(
    //       this.userClient.send({cmd: 'get_user_by_id'}, { id: payload.id })
    //   );
    const data = await this.prisma.user.findFirst({
      where: { id: payload.id },
    });
    console.log(
      '👤 User found for refresh:',
      data ? `Yes (${data.email})` : 'No',
    );

    if (!data) {
      throw new ForbiddenException('Invalid refresh token - user not found');
    }

    console.log('🎫 Generating new access token...');
    const newAccessToken = await this.jwtService.signAsync({
      id: data.id,
      email: data.email,
      phone: data.phone,
      role: data.role,
    });

    console.log('✅ New access token generated successfully');

    return {
      success: true,
      message: 'Access Token',
      access_token: newAccessToken,
    };
  }

  // async getDeviceTokens(userIds: number[]) {
  //   const users = await this.prisma.user.findMany({
  //     where: {
  //       userId: { in: userIds },
  //       isDeleted: false,
  //     },
  //     select: {
  //       userId: true,
  //       device_tokens: true,
  //     },
  //   });
  //   return users;
  // }

  // async googleLoginByMobile(data: GoogleLoginDto) {
  //   const { idToken } = data;
  //   let userData;

  //   const client = new OAuth2Client(envConfig().GOOGLE_ANDROID_CLIENTID);
  //   console.log(envConfig().GOOGLE_ANDROID_CLIENTID, 'client');
  //   const ticket = await client.verifyIdToken({
  //     idToken: idToken,
  //     audience: [
  //       envConfig().GOOGLE_ANDROID_CLIENTID as string,
  //       envConfig().GOOGLE_IOS_CLIENTID as string,
  //     ],
  //   });
  //   const payload = ticket?.getPayload();
  //   //check user auth db
  //   const user = await this.prisma.user.findFirst({
  //     where: { email: payload?.email, isDeleted: false },
  //   });

  //   if (!user) {
  //     try {
  //       const { data } = await lastValueFrom(
  //         this.client.send({ cmd: 'create-user' }, { code: idToken }),
  //       );
  //       userData = {
  //         id: data.id,
  //         userId: data.id,
  //         email: data.email,
  //         phone: data.phone,
  //         role: data.role,
  //       };
  //       console.log('google user is');
  //     } catch (error) {
  //       console.error('user service error:', error);
  //       throw error;
  //     }
  //   } else {
  //     userData = {
  //       id: user.userId,
  //       userId: user.userId,
  //       email: user.email,
  //       phone: user.phone,
  //       role: user.role,
  //     };
  //   }

  //   const { access_token, refresh_token } = await this.encryptedData(userData);

  //   //  console.log("payload is ",userData)
  //   return {
  //     success: true,
  //     message: 'Login Successful',
  //     data: userData,
  //     access_token,
  //     refresh_token,
  //   };
  // }

  // async facebookLoginByMobile(data: FacebookLoginDto) {
  //   const { accessToken } = data;
  //   let userData;
  //   console.log('access token ', accessToken);
  //   const decodedToken = await admin.auth().verifyIdToken(accessToken);
  //   //check user auth db
  //   const email = decodedToken.email;

  //   const user = await this.prisma.user.findUnique({
  //     where: { email },
  //   });

  //   if (!user) {
  //     try {
  //       const { data } = await lastValueFrom(
  //         this.client.send(
  //           { cmd: 'create-facebook-user' },
  //           { code: accessToken },
  //         ),
  //       );
  //       userData = {
  //         id: data.id,
  //         userId: data.id,
  //         email: data.email,
  //         phone: data.phone,
  //         role: data.role,
  //       };
  //       console.log('facebook user is', userData);
  //     } catch (error) {
  //       console.error('user service error:', error);
  //       throw error;
  //     }
  //   } else {
  //     userData = {
  //       id: user.userId,
  //       userId: user.userId,
  //       email: user.email,
  //       phone: user.phone,
  //       role: user.role,
  //     };
  //   }

  //   const { access_token, refresh_token } = await this.encryptedData(userData);

  //   //  console.log("payload is ",userData)
  //   return {
  //     success: true,
  //     message: 'Login Successful',
  //     data: userData,
  //     access_token,
  //     refresh_token,
  //   };
  // }

  // async appleLoginByMobile(data) {
  //   const { accessToken } = data;
  //   let userData;
  //   //console.log('access token ', accessToken);
  //   const decodedToken = await admin.auth().verifyIdToken(accessToken);
  //   //check user auth db
  //   const subId = decodedToken.sub;
  //   // console.log(
  //   //   'decoded email ',
  //   //   decodedToken.firebase['apple.com'],
  //   //   decodedToken.firebase.email,
  //   //   email,
  //   //   decodedToken,
  //   // );
  //   const user = await this.prisma.user.findFirst({
  //     where: { subId },
  //   });

  //   if (!user) {
  //     try {
  //       const { data } = await lastValueFrom(
  //         this.client.send({ cmd: 'create-apple-user' }, { code: accessToken }),
  //       );
  //       userData = {
  //         id: data.id,
  //         userId: data.id,
  //         email: data.email,
  //         phone: data.phone,
  //         role: data.role,
  //         subId: data.subId,
  //       };
  //       // console.log('apple user is', userData);
  //     } catch (error) {
  //       console.error('user service error:', error);
  //       throw error;
  //     }
  //   } else {
  //     userData = {
  //       id: user.userId,
  //       userId: user.userId,
  //       email: user.email,
  //       phone: user.phone,
  //       role: user.role,
  //       subId: data.subId,
  //     };
  //   }

  //   const { access_token, refresh_token } = await this.encryptedData(userData);

  //   console.log('payload is ', userData);
  //   return {
  //     success: true,
  //     message: 'Login Successful',
  //     data: userData,
  //     access_token,
  //     refresh_token,
  //   };
  // }

  async encryptedData(payload) {
    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWTSECRET,
      expiresIn: '7d',
    });

    return {
      access_token,
      refresh_token,
    };
  }
}
