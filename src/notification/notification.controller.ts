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
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationNavigationType } from '@prisma/client';

@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(@Req() req, @Body() createNotificationDto: CreateNotificationDto) {
    const { id: userId, companyId, branchId } = req.user;

    return this.notificationService.create(
      createNotificationDto,
      userId,
      companyId,
      branchId,
    );
  }

  @Get()
  findAll(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('navigationType')
    navigationType?: NotificationNavigationType,
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.notificationService.findAll(
      userId,
      companyId,
      branchId,
      page ? +page : 1,
      limit ? +limit : 20,
      navigationType,
    );
  }

  @Get('unread-count')
  unreadCount(@Req() req) {
    const { id: userId, companyId, branchId } = req.user;

    return this.notificationService.unreadCount(userId, companyId, branchId);
  }

  @Patch('read-all')
  markAllAsRead(
    @Req() req,
    @Body('navigationType')
    navigationType?: NotificationNavigationType,
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.notificationService.markAllAsRead(
      userId,
      companyId,
      branchId,
      navigationType,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.findOne(id);
  }

  @Patch(':id/read')
  markAsRead(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const { id: userId, companyId, branchId } = req.user;

    return this.notificationService.markAsRead(id, userId, companyId, branchId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.remove(id);
  }
}
