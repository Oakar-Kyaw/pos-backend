import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { hashedPassword } from 'src/utils/hash-password';
import { AccountType } from '@prisma/client';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  // -------- Create Company --------
  async create(createCompanyDto: CreateCompanyDto) {
    const { email, name, phone } = createCompanyDto;

    // Check if email, name, or phone already exists
    const existingCompany = await this.prisma.company.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(name ? [{ name }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingCompany) {
      throw new ConflictException(
        'Company with this email, name, or phone already exists',
      );
    }
    const { password, ...data } = createCompanyDto;
    const hashPassword = await hashedPassword(password);
    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          ...data,
        },
      });

      const user = await tx.user.create({
        data: {
          email: company.email,
          companyId: company.id,
          password: hashPassword,
          phone: company.phone,
          role: 'POS',
        },
      });

      const cashAccount = await tx.paymentData.create({
        data: {
          accountName: `${company.name} CASH`,
          accountType: AccountType.CASH,
          userId: Number(user.id),
          companyId: Number(company.id),
        },
      });

      return { company, user, cashAccount };
    });

    console.log('company:', result.company);
    console.log('user:', result.user);
    return {
      success: true,
      message: 'COMPANY CREATED',
      data: result.company,
    };
  }

  // -------- Get All Companies --------
  async findAll(query: {
    search?: string;
    page?: string;
    pageSize?: string;
    from?: string;
    to?: string;
    order?: 'asc' | 'desc';
    isDeleted?: boolean;
  }) {
    const page = query.page ? Number(query.page) : undefined;
    const pageSize = query.pageSize ? Number(query.pageSize) : undefined;

    // Now page and pageSize are numbers ✅

    const users = await this.prisma.company.findMany({
      where: {
        // your where filters...
      },
      skip: page && pageSize ? (page - 1) * pageSize : undefined,
      take: pageSize,
      orderBy: {
        id: query.order === 'asc' ? 'asc' : 'desc',
      },
    });

    return users;
  }

  // -------- Get Company by ID --------
  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'COMPANY_FETCHED',
      data: company,
    };
  }

  // -------- Update Company --------
  async update(id: number, updateCompanyDto: UpdateCompanyDto) {
    const existingCompany = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    // Check for unique constraints
    if (
      updateCompanyDto.email ||
      updateCompanyDto.name ||
      updateCompanyDto.phone
    ) {
      const conflictCompany = await this.prisma.company.findFirst({
        where: {
          NOT: { id },
          OR: [
            ...(updateCompanyDto.email
              ? [{ email: updateCompanyDto.email }]
              : []),
            ...(updateCompanyDto.name ? [{ name: updateCompanyDto.name }] : []),
            ...(updateCompanyDto.phone
              ? [{ phone: updateCompanyDto.phone }]
              : []),
          ],
        },
      });
      if (conflictCompany) {
        throw new ConflictException(
          'Company with this email, name, or phone already exists',
        );
      }
    }

    const company = await this.prisma.company.update({
      where: { id },
      data: {
        ...updateCompanyDto,
      },
    });

    return {
      success: true,
      message: 'COMPANY_UPDATED',
      data: company,
    };
  }

  // -------- Remove Company --------
  async remove(id: number) {
    const existingCompany = await this.prisma.company.findUnique({
      where: { id },
    });
    if (!existingCompany) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    // Soft delete (optional)
    const company = await this.prisma.company.update({
      where: { id },
      data: { email: `deleted_${Date.now()}_${existingCompany.email}` }, // optional soft-delete trick
    });

    return {
      success: true,
      message: 'COMPANY_REMOVED',
      data: company,
    };
  }
}
