import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUpload } from 'src/utils/file-upload';

@Controller('api/v1/subscriptions')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly uploader: FileUpload,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @Req() req,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const { id: userId, companyId: companyId } = req.user;
    const imageUrl = file
      ? await this.uploader.uploadPhoto(file, {
          folderName: 'payments',
        })
      : undefined;
    return this.subscriptionService.create(
      createSubscriptionDto,
      userId,
      companyId,
      imageUrl,
    );
  }

  @Get()
  findAll() {
    return this.subscriptionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.update(+id, updateSubscriptionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subscriptionService.remove(+id);
  }
}
