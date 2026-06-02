import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExceptionLogEntity } from '../../database/entities';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectRepository(ExceptionLogEntity)
    private readonly exceptionLogs: Repository<ExceptionLogEntity>,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{ url: string; method: string }>();
    const response = ctx.getResponse();
    if (response.headersSent) return;
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const responseMessage =
      typeof exceptionResponse === 'object' && exceptionResponse && 'message' in exceptionResponse
        ? (exceptionResponse as { message?: string | string[] }).message
        : undefined;
    const message = Array.isArray(responseMessage)
      ? responseMessage.join('；')
      : responseMessage || (exception instanceof Error ? exception.message : 'Internal server error');
    const stack = exception instanceof Error ? exception.stack : undefined;

    await this.exceptionLogs.save({ path: request.url, method: request.method, message, stack }).catch(() => undefined);
    response.status(status).json({ code: status, message, timestamp: new Date().toISOString() });
  }
}
