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
  Headers,
} from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { isAdmin, isManager } from 'src/utils/check-user-role';

@Controller('api/v1/attendances')
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  // ================= CREATE =================
  @Post()
  create(@Req() req, @Body() createAttendanceDto: CreateAttendanceDto) {
    const { id: userId, companyId, branchId } = req.user;

    return this.attendancesService.create(
      createAttendanceDto,
      userId,
      companyId,
      branchId,
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
  ) {
    const { id: userId, companyId, branchId, role } = req.user;
    //if not admin and manager , just see only his attendance
    let id = !(isAdmin(role) || isManager(role)) ? userId : undefined;
    if (filterUserId) id = filterUserId;
    return this.attendancesService.findAll(
      id,
      companyId,
      branchId,
      +page,
      +limit,
      startDate,
      endDate,
    );
  }

  @Get('monthly/grouped')
  getMonthlyAttendanceGroupedByStatus(
    @Req() req,
    @Query('filterUserId') filterUserId,
    @Query('date') date: Date,
  ) {
    const { id: userId, companyId, branchId, role } = req.user;

    return this.attendancesService.getMonthlyAttendanceGroupedByStatus(
      role,
      userId,
      companyId,
      branchId,
      date,
      filterUserId,
    );
  }

  // ================= FIND ONE =================
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;

    return this.attendancesService.findOne(+id, userId, companyId);
  }

  // ================= UPDATE =================
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    const { id: userId, companyId } = req.user;

    return this.attendancesService.update(
      +id,
      updateAttendanceDto,
      userId,
      companyId,
    );
  }

  // ================= DELETE =================
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;

    return this.attendancesService.remove(+id, userId, companyId);
  }

  @Post('check-in')
  createCheckIn(
    @Req() req,
    @Body() createAttendanceDto: CreateAttendanceDto,
    @Headers('x-timezone') timezone: string,
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.attendancesService.createCheckIn(
      createAttendanceDto,
      timezone,
      userId,
      companyId,
      branchId,
    );
  }

  // ================= FIND ALL =================
  @Get('date/filter')
  findByDateAndUserFilter(@Req() req, @Query('date') date) {
    const { id: userId, companyId, branchId } = req.user;

    return this.attendancesService.findByDateAndUserFilter(
      userId,
      companyId,
      branchId,
      date,
    );
  }

  @Post('user/check-out')
  createAttendanceByDateAndUserFilterAndUpdate(
    @Headers('x-timezone') timezone: string,
    @Req() req,
    @Body('date') date,
    @Body('checkOut') checkOut: string,
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.attendancesService.checkOut(
      timezone,
      userId,
      companyId,
      branchId,
      date,
      checkOut,
    );
  }

  @Post('data/excel')
  @UseInterceptors(FileInterceptor('excel'))
  postExcel(@UploadedFile() file: Express.Multer.File) {
    return this.attendancesService.postExcel(file);
  }
}
