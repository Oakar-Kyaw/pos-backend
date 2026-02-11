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
    const imageUrl = await this.uploader.uploadPhoto(file);
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
    const { id: userId } = req.user;

    return this.productService.findAll(
      userId,
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

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const { id: userId } = req.user;

    return this.productService.update(+id, updateProductDto, userId);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId } = req.user;

    return this.productService.remove(+id, userId);
  }
}
