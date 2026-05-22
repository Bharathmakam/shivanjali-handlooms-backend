import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private readonly logger = new Logger(StorageService.name);
  private bucket: string;
  private publicUrl: string;
  private isConfigured: boolean;

  constructor() {
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
      this.logger.log(`R2 configured: bucket=${this.bucket}, endpoint=${process.env.R2_S3_ENDPOINT}`);
    } else {
      this.logger.warn('R2 not configured. Using mock upload mode.');
    }
  }

  async uploadFile(file: Express.Multer.File, folder = 'products') {
    this.logger.log(`Upload request: ${file.originalname}, size: ${file.size}`);
    
    if (!this.isConfigured) {
      this.logger.warn('R2 not configured, returning mock URL');
      return {
        url: `https://via.placeholder.com/800x1200?text=${encodeURIComponent(file.originalname)}`,
        fileId: `mock_${Date.now()}`,
        thumbnailUrl: `https://via.placeholder.com/200x300?text=${encodeURIComponent(file.originalname)}`,
      };
    }

    try {
      const key = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
      this.logger.log(`Uploading to R2: ${this.bucket}/${key}`);
      
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));

      const url = this.publicUrl 
        ? `${this.publicUrl}/${key}`
        : `https://${this.bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

      this.logger.log(`Upload successful: ${url}`);
      return {
        url,
        fileId: key,
        thumbnailUrl: url,
      };
    } catch (error: any) {
      this.logger.error(`R2 upload failed: ${error.message}`, error.stack);
      return {
        url: `https://via.placeholder.com/800x1200?text=UploadFailed`,
        fileId: `error_${Date.now()}`,
        thumbnailUrl: `https://via.placeholder.com/200x300?text=UploadFailed`,
      };
    }
  }

  async deleteFile(fileId: string) {
    if (!this.isConfigured) return;
    try {
      await this.s3.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileId,
      }));
    } catch (error) {
      this.logger.error('R2 delete failed', error);
    }
  }
}
