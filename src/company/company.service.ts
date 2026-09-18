import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { hashedPassword } from 'src/utils/hash-password';
import { AccountType, Role } from '@prisma/client';

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
      // 5 day subscription
      const company = await tx.company.create({
        data: {
          ...data,
          subscriptionEndDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        },
      });

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
          accountName: `CASH`,
          accountType: AccountType.CASH,
          userId: Number(user.id),
          companyId: Number(company.id),
        },
      });

      return { company, user, cashAccount };
    });
    // Serverless ဆိုရင် response ပြန်ပို့ပြီးတာနဲ့ process ကို kill/freeze လုပ်ပစ်တတ်လို့ await မထားတဲ့ background call (Telegram) က ပြီးအောင် မပြေးရသေးဘဲ silent ဖြစ်နိုင်ပါတယ် — ဒါပေမယ့် Lightsail/EC2 လို traditional server မှာတော့ ဒီပြဿနာ မရှိပါဘူး။
    this.sendTelegramNotification(result.company).catch((err) =>
      console.error('Telegram notification error:', err.message),
    );

    return {
      success: true,
      message: 'COMPANY CREATED',
      data: result.company,
    };
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
