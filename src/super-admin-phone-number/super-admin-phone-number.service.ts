import { Injectable } from '@nestjs/common';
import { CreateSuperAdminPhoneNumberDto } from './dto/create-super-admin-phone-number.dto';
import { UpdateSuperAdminPhoneNumberDto } from './dto/update-super-admin-phone-number.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class SuperAdminPhoneNumberService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createSuperAdminPhoneNumberDto: CreateSuperAdminPhoneNumberDto) {
    const data = await this.prisma.superAdminPhoneNumber.create({
      data: createSuperAdminPhoneNumberDto,
    });
    return {
      success: true,
      data,
      message: 'Super Admin Phone is created successfully',
    };
  }

  async findAll() {
    const data = await this.prisma.superAdminPhoneNumber.findMany();

    return {
      success: true,
      data,
      message: 'This is super admin phone numbers',
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} superAdminPhoneNumber`;
  }

  update(
    id: number,
    updateSuperAdminPhoneNumberDto: UpdateSuperAdminPhoneNumberDto,
  ) {
    return `This action updates a #${id} superAdminPhoneNumber`;
  }

  remove(id: number) {
    return `This action removes a #${id} superAdminPhoneNumber`;
  }
}
