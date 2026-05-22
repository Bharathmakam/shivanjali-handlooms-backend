import { Controller, Post, UploadedFile, UploadedFiles, UseGuards, UseInterceptors, Body, ParseFilePipe, FileTypeValidator, MaxFileSizeValidator } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { StorageService } from './imagekit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('imagekit')
export class ImageKitController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body('folder') folder?: string) {
    return this.storageService.uploadFile(file, folder || 'products');
  }

  @Post('upload-multi')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FilesInterceptor('files', 10, {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[], @Body('folder') folder?: string) {
    const results = await Promise.all(
      files.map(file => this.storageService.uploadFile(file, folder || 'products')),
    );
    return results;
  }
}