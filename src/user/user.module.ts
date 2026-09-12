import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { FileUpload } from 'src/utils/file-upload';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService, FileUpload],
})
export class UserModule {}
