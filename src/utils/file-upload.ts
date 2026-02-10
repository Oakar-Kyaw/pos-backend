import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class FileUpload {
  private r2: S3Client;

  constructor() {
    console.log(
      'endpoint',
      process.env.CLOUDFLARE_R2_ENDPOINT,
      'credentials',
      'accessKeyId',
      process.env.CLOUDFLARE_ACCESS_KEY_ID!,
      'secretAccessKey',
      process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
    );
    this.r2 = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadPhoto(file: Express.Multer.File): Promise<string> {
    const optimized = await sharp(file.buffer).webp({ quality: 90 }).toBuffer();

    const fileName = `products/${Date.now()}-${file.originalname}.webp`;
    await this.r2.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
        Key: fileName,
        Body: optimized,
        ContentType: 'image/webp',
      }),
    );
    // console.log(
    //   'upload uis ',
    //   file,
    //   `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`,
    // );
    return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;
  }
}
