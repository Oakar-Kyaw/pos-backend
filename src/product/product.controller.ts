import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseInterceptors,
  UploadedFile,
  Query,
  Inject,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileUpload } from 'src/utils/file-upload';
import {
  CreateInventoryDto,
  UpdateInventoryDto,
} from './dto/create-inventory-item';
import { isAdmin, isManager } from 'src/utils/check-user-role';
import { FileNotFoundException } from 'src/utils/errors/file-not-found-exception';
import {
  ClientProxy,
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { SocketGatewaysService } from 'src/socket-gateways/socket.gateway';

@Controller('api/v1/products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly uploader: FileUpload,
    @Inject('WORKER_SERVICE') private readonly notificationClient: ClientProxy,
    private readonly socketGateway: SocketGatewaysService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Req() req,
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    //console.log('req.user ', req.user);
    const { id: userId, companyId: companyId } = req.user;
    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.uploader.uploadPhoto(file, {
        folderName: 'products',
      });
    }
    return this.productService.create(
      createProductDto,
      userId,
      companyId,
      imageUrl,
    );
  }

  @Get()
  findAll(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    const { id: userId, companyId } = req.user;

    return this.productService.findAll(
      userId,
      companyId,
      Number(page),
      Number(limit),
      search,
    );
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const { id: userId } = req.user;

    return this.productService.findOne(+id, userId);
  }

  @Get('barcode/:barcodeNo')
  findByBarcode(@Req() req, @Param('barcodeNo') barcodeNo: string) {
    const { companyId } = req.user;

    return this.productService.findByBarcode(companyId, barcodeNo);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('PATCH UPDATE API HIT', updateProductDto);
    console.log('file:', file);
    const { id: userId, companyId: companyId } = req.user;
    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.uploader.uploadPhoto(file, {
        folderName: 'products',
      });
    }

    return this.productService.update(
      +id,
      updateProductDto,
      userId,
      companyId,
      imageUrl,
    );
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId } = req.user;

    return this.productService.remove(+id, userId);
  }

  @Post('expire-items')
  async createLostAndExpireItem(
    @Req() req,
    @Body() createInventoryDto: CreateInventoryDto,
  ) {
    //console.log('req.user ', req.user);
    const { id: userId, companyId: companyId } = req.user;
    return this.productService.createLostAndExpireItems(
      createInventoryDto,
      userId,
      companyId,
    );
  }

  @Patch('expire-items/:id')
  async updateLostAndExpireItem(
    @Req() req,
    @Param('id') id: string,
    @Body() update: UpdateInventoryDto,
  ) {
    //console.log('req.user ', req.user);
    const { id: userId, companyId: companyId } = req.user;
    return this.productService.updateLostAndExpireItems(
      Number(id),
      update,
      userId,
      companyId,
    );
  }

  @Patch('expire-items/:id/confirm')
  async updatePurchaseConfirm(@Req() req, @Param('id') id: number) {
    console.log('req.user ', id);
    const { id: userId, companyId: companyId } = req.user;
    return this.productService.updatePurchaseConfirm(
      Number(id),
      userId,
      companyId,
    );
  }

  @Get('inventory/list')
  findAllExpireRequest(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('type') type?: string,
    @Query('filterUserId') filterUserId?: number,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    const { id: userId, companyId, branchId, role } = req.user;
    //if not admin and manager , just see only his attendance
    let id = !(isAdmin(role) || isManager(role)) ? userId : undefined;
    if (filterUserId) id = filterUserId;
    return this.productService.findAllInventoryManagement(
      id,
      companyId,
      branchId,
      Number(page),
      Number(limit),
      type,
      startDate,
      endDate,
    );
  }

  @Delete('inventory/list/:id')
  deleteExpireRequest(@Param('id') id: number) {
    return this.productService.deleteInventoryManagement(id);
  }

  @Post('excel')
  @UseInterceptors(FileInterceptor('file'))
  async createProductByExcel(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { id: userId, companyId: companyId } = req.user;
    if (!file) throw new FileNotFoundException('File not found');

    const excelUrl = await this.uploader.uploadExcel(file, {
      folderName: 'excel',
    });

    this.notificationClient
      .emit('product_excel', { excelUrl, userId, companyId })
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

  @EventPattern('product_progress')
  async sendProductExcelProgress(@Payload() data: any) {
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
