import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanFeatureDto } from './create-plan-feature.dto';

export class UpdatePlanFeatureDto extends PartialType(CreatePlanFeatureDto) {}
