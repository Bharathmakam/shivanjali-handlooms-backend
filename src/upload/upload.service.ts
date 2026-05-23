import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ImageProcessingService } from './image-processing.service';

@Injectable()
export class UploadService {
  private s3: S3Client;
  private readonly logger = new Logger(UploadService.name);
  private bucket: string;
  private publicUrl: string;
  private isConfigured: boolean;

  constructor(private readonly imageProcessing: ImageProcessingService) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    this.bucket = process.env.R2_BUCKET_NAME || 'withered-salad-0434';
    this.publicUrl = process.env.R2_PUBLIC_URL || '';
    this.isConfigured = !!(accountId && accessKeyId && secretAccessKey);

    if (this.isConfigured) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_S3_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: accessKeyId!,
          secretAccessKey: secretAccessKey!,
        },
      });
      this.logger.log(`R2 configured: bucket=${this.bucket}`);
    } else {
      this.logger.warn('R2 not configured. Uploads will fail.');
    }
  }

  async uploadFile(file: Express.Multer.File, folder = 'products') {
    this.logger.log(`Upload request: ${file.originalname}, size: ${file.size}`);

    if (!this.isConfigured) {
      throw new InternalServerErrorException('Cloud storage is not configured. Please contact support.');
    }

    // Validate the image with Sharp
    const validation = await this.imageProcessing.validateImage(file.buffer);
    if (!validation.valid) {
      this.logger.warn(`Invalid image uploaded: ${validation.error}`);
      throw new BadRequestException(`Invalid image: ${validation.error}`);
    }

    // Process image into multiple sizes + WebP
    const processed = await this.imageProcessing.processUpload(file);

    try {
      const baseKey = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-').replace(/\.[^.]+$/, '')}`;

      // Upload all variants to R2 in parallel
      await Promise.all([
        this.uploadToR2(`${baseKey}.webp`, processed.original, 'image/webp'),
        this.uploadToR2(`${baseKey}-large.webp`, processed.large, 'image/webp'),
        this.uploadToR2(`${baseKey}-medium.webp`, processed.medium, 'image/webp'),
        this.uploadToR2(`${baseKey}-thumb.webp`, processed.thumbnail, 'image/webp'),
      ]);

      const baseUrl = this.publicUrl
        ? `${this.publicUrl}/${baseKey}`
        : `https://${this.bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${baseKey}`;

      this.logger.log(`Upload successful: ${baseUrl}.webp (+ variants)`);
      return {
        url: `${baseUrl}.webp`,
        fileId: baseKey,
        thumbnailUrl: `${baseUrl}-thumb.webp`,
        mediumUrl: `${baseUrl}-medium.webp`,
        largeUrl: `${baseUrl}-large.webp`,
        width: processed.metadata.width,
        height: processed.metadata.height,
        originalSize: processed.metadata.size,
      };
    } catch (error: any) {
      this.logger.error(`R2 upload failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Image upload failed. Please try again.');
    }
  }

  private async uploadToR2(key: string, buffer: Buffer, contentType: string) {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return key;
  }

  async deleteFile(fileId: string) {
    if (!this.isConfigured) return;
    try {
      const variants = ['.webp', '-large.webp', '-medium.webp', '-thumb.webp'];
      await Promise.all(
        variants.map(suffix =>
          this.s3.send(new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: `${fileId}${suffix}`,
          })).catch(() => {})
        )
      );
      this.logger.log(`Deleted file variants: ${fileId}`);
    } catch (error) {
      this.logger.error('R2 delete failed', error);
    }
  }
}