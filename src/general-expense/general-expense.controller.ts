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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { userId, companyId, branchId } = req.user;

    return this.generalExpenseService.findAll(
      userId,
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
