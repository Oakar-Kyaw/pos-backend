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
} from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

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
  findAll(@Req() req, @Query('page') page = '1', @Query('limit') limit = '10') {
    const { id: userId, companyId, branchId } = req.user;

    return this.attendancesService.findAll(
      userId,
      companyId,
      branchId,
      +page,
      +limit,
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
  createCheckIn(@Req() req, @Body() createAttendanceDto: CreateAttendanceDto) {
    const { id: userId, companyId, branchId } = req.user;

    return this.attendancesService.createCheckIn(
      createAttendanceDto,
      userId,
      companyId,
      branchId,
    );
  }
}
