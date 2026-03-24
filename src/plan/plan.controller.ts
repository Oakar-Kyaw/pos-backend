import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller('api/v1/plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  // ================= CREATE =================
  @Post()
  create(@Req() req, @Body() createPlanDto: CreatePlanDto) {
    // You can optionally restrict only admin users here
    return this.planService.create(createPlanDto);
  }

  // ================= FIND ALL =================
  @Get()
  findAll(@Req() req) {
    return this.planService.findAll();
  }

  // ================= FIND ONE =================
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.planService.findOne(+id);
  }

  // ================= UPDATE =================
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    return this.planService.update(+id, updatePlanDto);
  }

  // ================= DELETE =================
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.planService.remove(+id);
  }
}
