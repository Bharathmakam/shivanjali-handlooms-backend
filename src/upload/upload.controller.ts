import { Controller, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile, UploadedFiles, Body } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body('folder') folder?: string) {
    return this.uploadService.uploadFile(file, folder || 'products');
  }

  @Post('multi')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FilesInterceptor('files', 10, {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[], @Body('folder') folder?: string) {
    const results = await Promise.all(
      files.map(file => this.uploadService.uploadFile(file, folder || 'products')),
    );
    return results;
  }

  @Delete(':fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteFile(@Param('fileId') fileId: string) {
    await this.uploadService.deleteFile(fileId);
    return { message: 'File deleted successfully' };
  }
}