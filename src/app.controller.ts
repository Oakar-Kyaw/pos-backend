import { Controller, Get, Headers, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { ClientProxy } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('WORKER_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-notification')
  testNotification(@Headers('accept-language') language: string) {
    console.log(language);
    this.notificationClient.emit('send_low_stock_alert_push_notification', [
      {
        id: '9',
        name: "L'Oreal ခရမ်",
        stock: 2,
        minStock: 10,
        // token:
        //   'c09YPRqIQWCVeSlBDVXqFi:APA91bEvoT0smvsfnucN4sP9XirG4WE_ahtRH0_2gjMB9ovtrPSoLGR4yPzsPNtgvdZHrdRe6zUk3Z17Ck4nFfQ3lYdeY0SDci98a6-RyJ89SN2MJgao-b8',
        imageUrl:
          'https://pub-98df54997b4b412faad3882b6ccd6302.r2.dev/products/1784960884397-images%20(6).jpeg.webp',
        language,
      },
    ]);
    return { message: 'Event emitted' };
  }
}
