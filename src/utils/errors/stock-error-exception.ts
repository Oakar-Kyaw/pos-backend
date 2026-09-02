import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientStockError extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.NOT_FOUND); // 404
  }
}
