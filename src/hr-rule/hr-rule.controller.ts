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
import { HrRuleService } from './hr-rule.service';
import { CreateHrRuleDto } from './dto/create-hr-rule.dto';
import { UpdateHrRuleDto } from './dto/update-hr-rule.dto';

@Controller('api/v1/hr-rules')
export class HrRulesController {
  constructor(private readonly hrRulesService: HrRuleService) {}

  // ================= CREATE =================
  @Post()
  create(@Req() req, @Body() createHrRuleDto: CreateHrRuleDto) {
    const { id: userId, companyId, branchId } = req.user;

    return this.hrRulesService.create(
      createHrRuleDto,
      userId,
      companyId,
      branchId,
    );
  }

  // ================= FIND ALL =================
  @Get()
  findAll(@Req() req, @Query('branchId') branchId?: string) {
    const { id: userId, companyId } = req.user;

    return this.hrRulesService.findAll(
      userId,
      companyId,
      branchId ? +branchId : undefined,
    );
  }

  // ================= FIND ONE =================
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;

    return this.hrRulesService.findOne(+id, userId, companyId);
  }

  // ================= UPDATE =================
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateHrRuleDto: UpdateHrRuleDto,
  ) {
    const { id: userId, companyId } = req.user;

    return this.hrRulesService.update(+id, updateHrRuleDto, userId, companyId);
  }

  // ================= DELETE =================
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;

    return this.hrRulesService.remove(+id, userId, companyId);
  }
}
