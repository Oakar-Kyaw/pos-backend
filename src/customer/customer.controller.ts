import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileNotFoundException } from 'src/utils/errors/file-not-found-exception';
import { FileUpload } from 'src/utils/file-upload';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { SocketGatewaysService } from 'src/socket-gateways/socket.gateway';

@Controller('api/v1/customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly uploader: FileUpload,
    @Inject('USER_WORKER_SERVICE')
    private readonly userWorkerClient: ClientProxy,
    private readonly socketGateway: SocketGatewaysService,
  ) {}

  @Post()
  create(@Req() req, @Body() createCustomerDto: CreateCustomerDto) {
    const { id: userId, companyId } = req.user;

    return this.customerService.create(createCustomerDto, userId, companyId);
  }

  @Get()
  findAll(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.customerService.findAll(
      userId,
      companyId,
      branchId,
      Number(page),
      Number(limit),
      search,
    );
  }

  @Get('filter')
  findByfilter(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    const { id: userId, companyId, branchId } = req.user;
    //console.log('start and end is: ', supplierId, startDate, endDate);
    return this.customerService.findByFilter(
      companyId,
      branchId,
      Number(page),
      Number(limit),
      search,
    );
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId, branchId } = req.user;

    return this.customerService.findOne(+id, userId, companyId, branchId);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.customerService.update(
      +id,
      updateCustomerDto,
      userId,
      companyId,
      branchId,
    );
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId, branchId, role } = req.user;
    if (role != 'ADMIN') throw new ForbiddenException('User is not Admin');
    return this.customerService.remove(+id, userId, companyId, branchId);
  }

  @Post('excel')
  @UseInterceptors(FileInterceptor('file'))
  async createCustomerByExcel(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { id: userId, companyId: companyId } = req.user;
    if (!file) throw new FileNotFoundException('File not found');

    const excelUrl = await this.uploader.uploadExcel(file, {
      folderName: 'excel',
    });

    this.userWorkerClient
      .emit('user_excel', { excelUrl, userId, companyId })
      .subscribe({
        next: () => console.log('✅ EMIT SUCCESS'),
        error: (err) => console.error('❌ EMIT ERROR:', err),
      });

    return {
      success: true,
      message: 'Excel File uploaded',
    };
    // return this.productService.uploadProductWithExcel();
  }

  @EventPattern('customer_progress')
  async sendUserExcelProgress(@Payload() data: any) {
    console.log('data ', data);

    try {
      this.socketGateway.emitProgress(data.userId, {
        percent: data.percent,
        processed: data.processed,
        total: data.total,
      });
    } catch (error) {
      console.error('Failed to process product progress:', error);
    }
  }
}
