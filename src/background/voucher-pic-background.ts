import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from 'prisma/prisma.service';
import { FileUpload } from 'src/utils/file-upload';
import * as fs from 'fs/promises';
import path from 'path';

@Processor('voucher-photos', { concurrency: 2 })
export class VoucherPhotoConsumer extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    readonly uploadFile: FileUpload,
  ) {
    super();
  }
  async process(job: Job): Promise<{ uploaded: number }> {
    console.log(`Picked up job ${job.id}`);
    console.log('Job data:', job.data);

    const { voucherId, tempPaths } = job.data;
    const total = tempPaths.length;
    const photoUrls: string[] = [];
    for (let i = 0; i < total; i++) {
      let temp = tempPaths[i];
      const buffer = await fs.readFile(temp);
      const originalname = path.basename(temp);
      const fakeFile = {
        buffer,
        originalname,
      } as Express.Multer.File;

      try {
        const url = await this.uploadFile.uploadPhoto(fakeFile, {
          folderName: 'vouchers',
        });
        photoUrls.push(url);
        let percent = Math.round(((i + 1) / total) * 100);
        await job.updateProgress(percent);
      } catch (err) {
        console.error(`Failed to upload file ${temp}:`, err);
      } finally {
        // ✅ Always clean up temp file, even on failure
        await fs
          .unlink(temp)
          .catch(() => console.warn(`Could not delete temp file: ${temp}`));
      }
      // Save photo URLs to DB
      await this.prisma.paymentPhoto.createMany({
        data: photoUrls.map((url) => ({
          voucherId,
          photoUrl: url,
        })),
      });

      console.log(
        `✅ Uploaded ${photoUrls.length} photos for voucher ${voucherId}`,
      );
    }
    return { uploaded: photoUrls.length };
  }
}
