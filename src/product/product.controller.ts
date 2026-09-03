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
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUpload } from 'src/utils/file-upload';
import {
  CreateInventoryDto,
  UpdateInventoryDto,
} from './dto/create-inventory-item';
import { isAdmin, isManager } from 'src/utils/check-user-role';

@Controller('api/v1/products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly uploader: FileUpload,
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
    @Param() @Param('id') id: string,
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
}
