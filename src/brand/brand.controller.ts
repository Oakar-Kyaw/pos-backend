import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('api/v1/brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  create(@Req() req, @Body() createBrandDto: CreateBrandDto) {
    console.log('req user is ', req);
    const { id, companyId, branchId } = req.user;
    return this.brandService.create(createBrandDto, id, companyId, branchId);
  }

  @Get()
  findAll(@Req() req, @Query('search') search?: string) {
    console.log('req user is ', req.user);
    const { id, companyId } = req.user;
    return this.brandService.findAll(id, companyId, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brandService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
    return this.brandService.update(+id, updateBrandDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.brandService.remove(+id);
  }
}
