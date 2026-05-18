// Barcha xatolarni Laravel { message, error: true, data } shakliga aylantiradi.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RawHttpException } from '@/common/exceptions/raw-http.exception';
import { buildError } from '@/common/utils/response.util';

@Catch()
export class BusinessExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BusinessExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Laravel response()->json([...]) — flat format (auth middleware kabi).
    if (exception instanceof RawHttpException) {
      response.status(exception.status).json(exception.body);
      return;
    }

    if (exception instanceof BusinessException) {
      response
        .status(exception.status)
        .json(buildError(exception.message, exception.data));
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] })?.message ?? 'Error');
      // ValidationPipe message'ni massiv qilib qaytaradi — birinchisini olamiz.
      const finalMessage = Array.isArray(message) ? message[0] : message;
      response.status(status).json(buildError(finalMessage));
      return;
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );
    const errorMessage =
      exception instanceof Error ? exception.message : 'Internal server error';
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(buildError(errorMessage));
  }
}
