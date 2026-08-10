import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
//import { LoginDto } from './dto/login.dto';
//import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/utils/public';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('login')
  login(@Body() data: LoginDto) {
    console.log('log', data);
    return this.authService.signIn(data);
  }

  // @HttpCode(HttpStatus.OK)
  // @Public()
  // @Post('google')
  // @ApiBody({ type: GoogleLoginDto })
  // @ApiResponse({ type: LoginResponseDto })
  // @Serialize(LoginResponseDto)
  // googleLogin(@Body() data: GoogleLoginDto) {
  //   return this.authService.googleLogin(data);
  // }

  // @HttpCode(HttpStatus.OK)
  // @Public()
  // @Post('google/mobile')
  // @ApiBody({ type: GoogleLoginDto })
  // @ApiResponse({ type: LoginResponseDto })
  // //@Serialize(LoginResponseDto)
  // googleLoginByMobile(@Body() data: GoogleLoginDto) {
  //   return this.authService.googleLoginByMobile(data);
  // }

  // @HttpCode(HttpStatus.OK)
  // @Public()
  // @Post('google/mobile')
  // @ApiBody({ type: GoogleLoginDto })
  // @ApiResponse({ type: LoginResponseDto })
  // @Serialize(LoginResponseDto)
  // facebookLoginByMobile(@Body() data: FacebookLoginDto) {
  //   return this.authService.facebookLoginByMobile(data);
  // }

  // @HttpCode(HttpStatus.OK)
  // @Public()
  // @Post('facebook/mobile')
  // @ApiBody({ type: FacebookLoginDto })
  // @ApiResponse({ type: LoginResponseDto })
  // @Serialize(LoginResponseDto)
  // facebookLogin(@Body() data: FacebookLoginDto) {
  //   console.log('data ', data);
  //   return this.authService.facebookLoginByMobile(data);
  // }

  // @HttpCode(HttpStatus.OK)
  // @Public()
  // @Post('apple/mobile')
  // @ApiBody({ type: FacebookLoginDto })
  // @ApiResponse({ type: LoginResponseDto })
  // @Serialize(LoginResponseDto)
  // appleLoginMobile(@Body() data: FacebookLoginDto) {
  //   // console.log('data ', data);
  //   return this.authService.appleLoginByMobile(data);
  // }

  // @HttpCode(HttpStatus.OK)
  // @Public()
  // @Post('apple')
  // @ApiBody({ type: AppleLoginDto })
  // @ApiResponse({ type: LoginResponseDto })
  // @Serialize(LoginResponseDto)
  // appleLogin(@Body() data: AppleLoginDto) {
  //   return this.authService.appleLogin(data);
  // }

  @Post('logout')
  loginout(
    @Headers('Authorization') authorizationHeader: string,
    @Body('deviceToken') deviceToken?: string,
  ) {
    return this.authService.signOut(authorizationHeader, deviceToken);
  }

  @Public()
  @Get('refresh')
  refreshToken(@Headers('Authorization') authorizationHeader: string) {
    console.log('authorization token', authorizationHeader);
    const token = authorizationHeader.split(' ')[1];
    return this.authService.refreshToken(token);
  }

  // @Post('device-tokens')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: { userIds: { type: 'array', items: { type: 'number' } } },
  //   },
  // })
  // async getDeviceTokens(@Body() body: { userIds: number[] }) {
  //   return this.authService.getDeviceTokens(body.userIds);
  // }
}
