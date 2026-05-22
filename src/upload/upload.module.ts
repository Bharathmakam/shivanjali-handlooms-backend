import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { ImageProcessingService } from './image-processing.service';
import { UploadController } from './upload.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [UploadService, ImageProcessingService],
  controllers: [UploadController],
  exports: [UploadService, ImageProcessingService],
})
export class UploadModule {}