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
import { PlanFeatureService } from './plan-feature.service';
import { CreatePlanFeatureDto } from './dto/create-plan-feature.dto';
import { UpdatePlanFeatureDto } from './dto/update-plan-feature.dto';

@Controller('api/v1/plan-features')
export class PlanFeatureController {
  constructor(private readonly planFeatureService: PlanFeatureService) {}

  // ================= CREATE =================
  @Post()
  create(@Req() req, @Body() createPlanFeatureDto: CreatePlanFeatureDto) {
    return this.planFeatureService.create(createPlanFeatureDto);
  }

  @Post('create-many')
  createInAllPlan(
    @Req() req,
    @Body() createPlanFeatureDto: CreatePlanFeatureDto[],
  ) {
    return this.planFeatureService.createInAllPlan(createPlanFeatureDto);
  }

  // ================= FIND ALL =================
  @Get()
  findAll(@Req() req) {
    return this.planFeatureService.findAll();
  }

  // ================= FIND ONE =================
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.planFeatureService.findOne(+id);
  }

  // ================= UPDATE =================
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updatePlanFeatureDto: UpdatePlanFeatureDto,
  ) {
    return this.planFeatureService.update(+id, updatePlanFeatureDto);
  }

  // ================= DELETE =================
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.planFeatureService.remove(+id);
  }
}
