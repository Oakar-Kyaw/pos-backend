import { PartialType } from '@nestjs/mapped-types';
import { CreateHrRuleDto } from './create-hr-rule.dto';

export class UpdateHrRuleDto extends PartialType(CreateHrRuleDto) {}
