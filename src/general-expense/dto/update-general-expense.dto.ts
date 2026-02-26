import { PartialType } from '@nestjs/mapped-types';
import { CreateGeneralExpenseDto } from './create-general-expense.dto';

export class UpdateGeneralExpenseDto extends PartialType(CreateGeneralExpenseDto) {}
