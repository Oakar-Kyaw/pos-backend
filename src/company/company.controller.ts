import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUpload } from 'src/utils/file-upload';
// import { FileInterceptor } from '@nestjs/platform-express';

@Controller('api/v1/companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly uploader: FileUpload,
  ) {}

  // ===== CREATE COMPANY =====
  @Post()
  @UseInterceptors(FileInterceptor('photoUrl')) // optional photo upload
  create(
    @Body() createCompanyDto: CreateCompanyDto,
    // @UploadedFile() file: Express.Multer.File
  ) {
    return this.companyService.create(createCompanyDto /*, file*/);
  }

  // ===== GET ALL COMPANIES =====
  @Get()
  findAll(
    @Query()
    query: {
      search?: string;
      page?: string;
      pageSize?: string;
      from?: string;
      to?: string;
      order?: 'asc' | 'desc';
      isDeleted?: boolean;
    },
  ) {
    return this.companyService.findAll(query);
  }

  // ===== GET COMPANY BY ID =====
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.findOne(id);
  }

  // ===== UPDATE COMPANY =====
  @Patch(':id')
  @UseInterceptors(FileInterceptor('photoUrl'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.uploader.uploadPhoto(file, {
        folderName: 'products',
      });
    }
    return this.companyService.update(
      id,
      updateCompanyDto,
      imageUrl /*, file*/,
    );
  }

  // ===== DELETE COMPANY =====
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.remove(id);
  }

  // ===== UPLOAD COMPANY PHOTO =====
  @Post('photo')
  // @UseInterceptors(FileInterceptor('file'))
  uploadPhoto() {
    // handle photo upload logic here
  }
}
