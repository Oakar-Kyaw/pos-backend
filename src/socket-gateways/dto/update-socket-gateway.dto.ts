import { PartialType } from '@nestjs/mapped-types';
import { CreateSocketGatewayDto } from './create-socket-gateway.dto';

export class UpdateSocketGatewayDto extends PartialType(CreateSocketGatewayDto) {}
