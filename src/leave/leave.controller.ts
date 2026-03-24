import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { isAdmin, isManager } from 'src/utils/check-user-role';
import { FileUpload } from 'src/utils/file-upload';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('api/v1/leaves')
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly uploader: FileUpload,
  ) {}

  // ================= CREATE =================
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Req() req,
    @Body() createLeaveDto: CreateLeaveDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { companyId, branchId } = req.user;
    const imageUrl = await this.uploader.uploadPhoto(file, {
      folderName: 'leaves',
    });
    return this.leaveService.create(
      createLeaveDto,
      companyId,
      branchId,
      imageUrl,
    );
  }

  // ================= FIND ALL =================
  @Get()
  findAll(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('filterUserId') filterUserId?: number,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('status') status?: string,
  ) {
    const { id: userId, companyId, branchId, role } = req.user;

    let id = !(isAdmin(role) || isManager(role)) ? userId : undefined;

    if (filterUserId) id = filterUserId;
    return this.leaveService.findAll(
      id,
      companyId,
      branchId,
      +page,
      +limit,
      startDate,
      endDate,
      status,
    );
  }

  // ================= FIND ONE =================
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;

    return this.leaveService.findOne(+id, userId, companyId);
  }

  // ================= UPDATE =================
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateLeaveDto: UpdateLeaveDto,
  ) {
    const { id: userId, companyId } = req.user;

    return this.leaveService.update(+id, updateLeaveDto, userId, companyId);
  }

  // ================= DELETE =================
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;

    return this.leaveService.remove(+id, userId, companyId);
  }
}
