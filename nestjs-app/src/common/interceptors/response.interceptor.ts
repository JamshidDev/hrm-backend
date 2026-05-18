// Javobni Laravel { message, error, data } shakliga o'raydi.
// @RawResponse() yoki javob allaqachon shu shaklda bo'lsa — o'ramaydi.

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { isApiResponse, buildSuccess } from '@/common/utils/response.util';
import { RAW_RESPONSE_KEY } from '@/common/decorators/raw-response.decorator';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((data: unknown) => {
        if (isRaw) return data;
        if (isApiResponse(data)) return data;
        return buildSuccess(true, data);
      }),
    );
  }
}
