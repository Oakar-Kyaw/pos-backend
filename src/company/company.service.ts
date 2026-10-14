import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { hashedPassword } from 'src/utils/hash-password';
import { AccountType, Prisma, Role } from '@prisma/client';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  // -------- Create Company --------
  async create(createCompanyDto: CreateCompanyDto) {
    const { email, name, phone, password, branch, ...rest } = createCompanyDto;

    const existingCompany = await this.prisma.company.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(name ? [{ name }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: { id: true },
    });

    if (existingCompany) {
      throw new ConflictException(
        'Company with this email, name, or phone already exists',
      );
    }

    // Hash everything in parallel BEFORE opening the transaction
    const [hashPassword, branchUsers] = await Promise.all([
      hashedPassword(password),
      Promise.all(
        (branch ?? []).map(async (b) => ({
          name: b.name,
          email: b.email,
          hashed: await hashedPassword(b.password),
        })),
      ),
    ]);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            email,
            name,
            phone,
            ...rest,
            subscriptionEndDate: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
            ),
          },
        });

        if (branchUsers.length > 0) {
          await tx.branch.createMany({
            data: branchUsers.map((b) => ({
              name: b.name,
              email: b.email,
              companyId: company.id,
            })),
          });

          await tx.user.createMany({
            data: branchUsers.map((b) => ({
              email: b.email,
              companyId: company.id,
              password: b.hashed,
              role: Role.ADMIN, // ← သင့် schema ရဲ့ branch role နဲ့ ညှိပါ
            })),
          });
        }

        const user = await tx.user.create({
          data: {
            email: company.email,
            companyId: company.id,
            password: hashPassword,
            phone: company.phone,
            role: Role.ADMIN,
          },
        });

        const cashAccount = await tx.paymentData.create({
          data: {
            accountName: 'CASH',
            accountType: AccountType.CASH,
            userId: Number(user.id),
            companyId: Number(company.id),
          },
        });

        return { company, user, cashAccount };
      });

      this.sendTelegramNotification(result.company).catch((err) =>
        console.error('Telegram notification error:', err.message),
      );

      return {
        success: true,
        message: 'COMPANY CREATED',
        data: result.company,
      };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Company with this email, name, or phone already exists',
        );
      }
      throw e;
    }
  }

  private async sendTelegramNotification(company: any) {
    const botMessageUrl = process.env.TELEGRAM_BOT_SEND_MESSAGE_URL;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botMessageUrl || !chatId) return;

    const message = `🎉 **Company အသစ်ရောက်ရှိပါပြီ!**\n\n🏢 **Name:** ${company.name}\n📧 **Email:** ${company.email}\n📞 **Phone:** ${company.phone || 'N/A'}\n🆔 **ID:** ${company.id}`;

    await fetch(botMessageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
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

    const company = await this.prisma.company.findMany({
      where: {
        // your where filters...
      },
      skip: page && pageSize ? (page - 1) * pageSize : undefined,
      take: pageSize,
      orderBy: {
        id: query.order === 'asc' ? 'asc' : 'desc',
      },
    });

    return {
      success: true,
      message: 'Company Lists',
      data: company,
    };
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
  async update(
    id: number,
    updateCompanyDto: UpdateCompanyDto,
    imageUrl?: string,
  ) {
    const existingCompany = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    // Check for unique constraints
    if (updateCompanyDto.name || updateCompanyDto.phone) {
      const conflictCompany = await this.prisma.company.findFirst({
        where: {
          NOT: { id },
          OR: [
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
        photoUrl: imageUrl,
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
