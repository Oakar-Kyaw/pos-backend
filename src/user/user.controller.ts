import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UseGuards,
  Req,
  Res,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateNotificationDeviceTokenDto } from './dto/create-notification-token.dto';
import { Public } from 'src/utils/public';

@Controller('api/v1/users')
//@UseGuards(AuthGuard) // Apply AuthGuard to all routes by default
export class UserController {
  constructor(
    private readonly userService: UserService,
    //private readonly fileUploadService: FileUpload,
  ) {}

  // @Post('device-token')
  // @ApiOperation({ summary: 'Sync device token' })
  // syncDeviceToken(@Body() dto: SyncDeviceTokenDto) {
  //   return this.userService.syncDeviceToken(dto);
  // }

  // @Post('device-token/mobile')
  // @ApiOperation({ summary: 'Sync device token' })
  // createAllDeviceToken(@Body() dto: SyncDeviceTokenDto) {
  //   return this.UserService.createDeviceToken(dto);
  // }

  // @Public()
  // @Serialize(CreatedUserResponseDto)
  //@UseInterceptors(FileInterceptor('photoUrl'))
  @Post()
  create(@Req() req, @Body() createUserWithProfileDto: CreateUserDto) {
    const { id: userId, companyId, branchId } = req.user;
    return this.userService.create(
      createUserWithProfileDto,
      companyId,
      branchId,
    );
  }
  @Get()
  findAll(
    @Req() req,
    @Query('email') email?: string,
    @Query('phone') phone?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('order') order?: 'asc' | 'desc',
    @Query('isDeleted') isDeleted?: boolean,
  ) {
    const { companyId } = req.user;

    return this.userService.findAll(
      {
        search,
        email,
        phone,
        page,
        limit,
        order,
        isDeleted,
      },
      companyId,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    console.log('Fetching user with ID:', id);
    const user = await this.userService.findOne(id);
    console.log('User found:', user);
    return user;
  }

  //@UseInterceptors(FileInterceptor('photoUrl'))
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserWithProfileDto: UpdateUserDto,
    //  @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.update(
      id,
      updateUserWithProfileDto,
      //  file
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }

  @Post('register/facebook/mobile')
  async facebookRegister(
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string,
    @Body('photoUrl') photoUrl: string,
    @Body('code') code: string,
  ) {
    return this.userService.facebookRegister({
      code: code,
      fristName: firstName,
      lastName: lastName,
      photoUrl: photoUrl,
    });
  }

  @Get('register/google/mobile')
  async googleRegister(@Query('code') code: string) {
    console.log('code', code);
    return this.userService.googleRegister(code);
  }

  @Post('photo')
  // @UseInterceptors(FileInterceptor('file'))
  async uploadFile() {
    // @UploadedFile() file: Express.Multer.File
    //return this.fileUploadService.uploadSingle({ file, folderName: 'profile' });
  }

  @Get('forgot/otp')
  async sendOtp(@Query('email') email: string, @Query('mode') mode?: string) {
    // return this.userService.sendOtp({ email, mode });
  }

  @Post('otp/send')
  async sendOtpPost() {
    //@Body() body: SendOtpDto
    // return this.userService.sendOtp(body);
  }

  @Post('signup/otp')
  @UseInterceptors()
  // FileInterceptor('file') // Handle multipart/form-data
  async sendSignupOtp() {
    // @Body() body: SendOtpDto
    // return this.userService.sendOtp({ ...body, mode: 'signup' });
  }

  @Post('forgot/otp/verify')
  async verifyOtp() {
    // @Body() body: VerifyOtpDto
    // const otp = body.otp || body.code;
    // if (!otp) {
    //   throw new BadRequestException('OTP code is required');
    // }
    // return this.UserService.verifyOtp({ ...body, otp });
  }

  @Patch('password/change')
  async changePassword() {
    // @Body() updatePasswordDto: UpdateUserPassword
    //return this.userService.updatePassword(updatePasswordDto);
  }

  // @Public()
  @Post('save-token')
  async createNotificationDeviceToken(
    @Req() req,
    @Body() data: CreateNotificationDeviceTokenDto,
  ) {
    const { id: userId, companyId, branchId, role } = req.user;
    return this.userService.createNotificationDeviceToken({
      deviceToken: data.deviceToken,
      isLogged: userId != null,
      role,
      userId,
      companyId,
      branchId,
    });
  }
}
