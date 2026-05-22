import { Module } from '@nestjs/common';
import { StorageService } from './imagekit.service';
import { ImageKitController } from './imagekit.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [StorageService],
  controllers: [ImageKitController],
  exports: [StorageService],
})
export class ImageKitModule {}
