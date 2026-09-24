import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

interface BufferedFile {
  buffer: Buffer;
}

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>(
        'CLOUDINARY_CLOUD_NAME',
      ),
      api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow<string>(
        'CLOUDINARY_API_SECRET',
      ),
      secure: true,
    });
  }

  uploadAvatar(file: BufferedFile, userId: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'daily-greens/avatars',
          public_id: `user-${userId}`,
          resource_type: 'image',
          overwrite: true,
          invalidate: true,
        },
        (error, result) => {
          if (error) {
            reject(new Error(error.message));
            return;
          }

          if (!result) {
            reject(new Error('Cloudinary did not return an upload result'));
            return;
          }

          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  uploadProductImage(
    file: BufferedFile,
    productId: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `daily-greens/products/${productId}`,
          resource_type: 'image',
          unique_filename: true,
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            reject(new Error(error.message));
            return;
          }

          if (!result) {
            reject(new Error('Cloudinary did not return an upload result'));
            return;
          }

          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  deleteImage(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      void cloudinary.uploader.destroy(
        publicId,
        {
          resource_type: 'image',
          invalidate: true,
        },
        (error: Error | null) => {
          if (error) {
            reject(new Error(error.message));
            return;
          }

          resolve();
        },
      );
    });
  }
}
