import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  success() {
    return { success: true };
  }

  ignored() {
    return { ignored: true };
  }
}
