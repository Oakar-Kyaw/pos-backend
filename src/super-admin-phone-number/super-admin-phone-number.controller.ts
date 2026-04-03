import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SuperAdminPhoneNumberService } from './super-admin-phone-number.service';
import { CreateSuperAdminPhoneNumberDto } from './dto/create-super-admin-phone-number.dto';
import { UpdateSuperAdminPhoneNumberDto } from './dto/update-super-admin-phone-number.dto';

@Controller('api/v1/super-admin-phone-numbers')
export class SuperAdminPhoneNumberController {
  constructor(
    private readonly superAdminPhoneNumberService: SuperAdminPhoneNumberService,
  ) {}

  @Post()
  create(
    @Body() createSuperAdminPhoneNumberDto: CreateSuperAdminPhoneNumberDto,
  ) {
    return this.superAdminPhoneNumberService.create(
      createSuperAdminPhoneNumberDto,
    );
  }

  @Get()
  findAll() {
    return this.superAdminPhoneNumberService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.superAdminPhoneNumberService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSuperAdminPhoneNumberDto: UpdateSuperAdminPhoneNumberDto,
  ) {
    return this.superAdminPhoneNumberService.update(
      +id,
      updateSuperAdminPhoneNumberDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.superAdminPhoneNumberService.remove(+id);
  }
}
