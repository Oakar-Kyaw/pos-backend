import { diskStorage } from 'multer';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

fs.mkdirSync('./uploads/temp', { recursive: true });
export const multerConfig = {
  storage: diskStorage({
    destination: './uploads/temp', // stream straight to disk
    filename: (req, file, cb) => {
      cb(null, `${uuid()}${path.extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 4, // max 4 photos
  },
};
