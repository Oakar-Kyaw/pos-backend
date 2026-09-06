import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { ClientProxy } from '@nestjs/microservices';
// import { S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class ProductWorkerService {
  // private r2: S3Client;
  constructor(
    private readonly prisma: PrismaService,
    @Inject('WORKER_SERVICE') private readonly notificationClient: ClientProxy,
  ) {
    // this.r2 = new S3Client({
    //   region: 'auto',
    //   endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    //   credentials: {
    //     accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    //     secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
    //   },
    // });
  }
  //   async downloadFromR2(key: string): Promise<Buffer> {
  //     const command = new GetObjectCommand({
  //       Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
  //       Key: key,
  //     });
  //     const response = await this.r2.send(command);
  //     const chunks: Uint8Array[] = [];
  //     for await (const chunk of response.Body as any) {
  //       chunks.push(chunk);
  //     }
  //     return Buffer.concat(chunks);
  //   }
  chuckArray<T>(array: T[], chunkSize: number): T[][] {
    let chunk: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunk.push(array.slice(i, i + chunkSize));
    }
    console.log('chunk is ', chunk);
    return chunk;
  }
  async createProductWithExcel(data) {
    const { excelUrl, userId, companyId } = data;
    const response = await axios.get(excelUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: null,
    });
    let chunkSize = 100;
    let chunks = this.chuckArray(rows, chunkSize);
    console.log(`📦 Split into ${chunks.length} chunks of up to 200 rows each`);

    let successCount = 0;
    let processed = 0;
    const failedRows: { row: number; error: string }[] = [];

    for (const [chunkIndex, chunk] of chunks.entries()) {
      console.log(
        `⏳ Processing chunk ${chunkIndex + 1}/${chunks.length} (rows ${
          chunkIndex * 200
        }–${chunkIndex * 200 + chunk.length - 1})...`,
      );

      try {
        const result = await this.prisma.product.createMany({
          data: chunk.map((row) => ({
            name: row['name'],
            code: row['code'],
            barcode: String(row['barcode']),
            price: Number(row['price']),
            minStock: row['minStock'],
            stock: Number(row['stock'] ?? 0),
            costPrice: row['costPrice'],
            companyId,
            userId,
          })),
          skipDuplicates: true,
        });
        processed += chunk.length;
        console.log(
          `✅ Chunk ${chunkIndex + 1} done — inserted ${result.count}/${chunk.length} rows`,
        );

        const percent = Math.round((processed / rows.length) * 100);

        console.log(`Progress: ${processed}/${rows.length} (${percent}%)`);

        // Send realtime progress
        this.notificationClient
          .emit('product_progress', {
            percent,
            processed,
            total: rows.length,
            userId,
          })
          .subscribe({
            next: () => console.log('✅ EMIT SUCCESS'),
            error: (err) => console.error('❌ EMIT ERROR:', err),
          });
      } catch (err) {
        console.error(`❌ Chunk ${chunkIndex + 1} failed:`, err.message);
        failedRows.push({ row: chunkIndex * 200, error: err.message });
      }
    }
  }
}
