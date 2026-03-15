import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  DefaultValuePipe,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { GeneralExpenseService } from './general-expense.service';
import { CreateGeneralExpenseDto } from './dto/create-general-expense.dto';
import { UpdateGeneralExpenseDto } from './dto/update-general-expense.dto';
import { isAdmin, isManager } from 'src/utils/check-user-role';

@Controller('api/v1/general-expenses')
export class GeneralExpenseController {
  constructor(private readonly generalExpenseService: GeneralExpenseService) {}

  @Post()
  create(@Req() req, @Body() createGeneralExpenseDto: CreateGeneralExpenseDto) {
    const { id: userId, companyId, branchId } = req.user;

    return this.generalExpenseService.create(
      createGeneralExpenseDto,
      userId,
      companyId,
      branchId,
    );
  }

  @Get()
  findAll(
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('filterUserId') filterUserId?: number,
  ) {
    const { userId, companyId, branchId, role } = req.user;
    //if not admin and manager , just see only his voucher
    let id = !(isAdmin(role) || isManager(role)) ? userId : undefined;
    //if filterUserId exist
    if (filterUserId) id = filterUserId;
    return this.generalExpenseService.findAll(
      id,
      companyId,
      branchId,
      page ? page : 1,
      limit ? limit : 10,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.generalExpenseService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGeneralExpenseDto: UpdateGeneralExpenseDto,
  ) {
    return this.generalExpenseService.update(id, updateGeneralExpenseDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.generalExpenseService.remove(id);
  }
}
