import { Module } from '@nestjs/common';
import { StorageService } from './imagekit.service';
import { ImageProcessingService } from './image-processing.service';
import { ImageKitController } from './imagekit.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [StorageService, ImageProcessingService],
  controllers: [ImageKitController],
  exports: [StorageService, ImageProcessingService],
})
export class ImageKitModule {}