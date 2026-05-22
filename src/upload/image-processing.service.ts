import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

export interface ProcessedImageSet {
  original: Buffer;
  originalContentType: string;
  large: Buffer;
  largeContentType: string;
  medium: Buffer;
  mediumContentType: string;
  thumbnail: Buffer;
  thumbnailContentType: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);
  private readonly sharpFn: any;

  private readonly SIZES = {
    large: { width: 1200, height: 1800 },
    medium: { width: 600, height: 900 },
    thumbnail: { width: 200, height: 300 },
  };

  private readonly QUALITY = { webp: 80, jpeg: 85 };

  constructor() {
    this.sharpFn = typeof sharp === 'function' ? sharp : (sharp as any).default || (sharp as any)['module.exports'];
  }

  async processUpload(file: Express.Multer.File): Promise<ProcessedImageSet> {
    this.logger.log(`Processing image: ${file.originalname} (${file.size} bytes)`);

    const metadata = await this.sharpFn(file.buffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error(`Invalid image: ${file.originalname}`);
    }

    const originalBuffer = await this.sharpFn(file.buffer)
      .webp({ quality: this.QUALITY.webp })
      .toBuffer();

    const largeBuffer = await this.resizeToWebP(file.buffer, this.SIZES.large);
    const mediumBuffer = await this.resizeToWebP(file.buffer, this.SIZES.medium);
    const thumbnailBuffer = await this.resizeToWebP(file.buffer, this.SIZES.thumbnail);

    this.logger.log(
      `Processed ${file.originalname}: ${metadata.width}x${metadata.height} -> ` +
      `original=${originalBuffer.length}B, large=${largeBuffer.length}B, ` +
      `medium=${mediumBuffer.length}B, thumbnail=${thumbnailBuffer.length}B`,
    );

    return {
      original: originalBuffer,
      originalContentType: 'image/webp',
      large: largeBuffer,
      largeContentType: 'image/webp',
      medium: mediumBuffer,
      mediumContentType: 'image/webp',
      thumbnail: thumbnailBuffer,
      thumbnailContentType: 'image/webp',
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format || 'unknown',
        size: file.size,
      },
    };
  }

  private async resizeToWebP(
    buffer: Buffer,
    size: { width: number; height: number },
  ): Promise<Buffer> {
    return this.sharpFn(buffer)
      .resize(size.width, size.height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: this.QUALITY.webp })
      .toBuffer();
  }

  async generateThumbnail(buffer: Buffer, width = 200, height = 300): Promise<Buffer> {
    return this.sharpFn(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
  }

  async getMetadata(buffer: Buffer): Promise<any> {
    return this.sharpFn(buffer).metadata();
  }

  async validateImage(buffer: Buffer): Promise<{ valid: boolean; error?: string }> {
    try {
      const metadata = await this.sharpFn(buffer).metadata();
      if (!metadata.format) {
        return { valid: false, error: 'Unable to determine image format' };
      }
      const allowedFormats = ['jpeg', 'png', 'webp', 'tiff', 'gif', 'avif'];
      if (!allowedFormats.includes(metadata.format)) {
        return { valid: false, error: `Unsupported image format: ${metadata.format}` };
      }
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message || 'Invalid image file' };
    }
  }
}