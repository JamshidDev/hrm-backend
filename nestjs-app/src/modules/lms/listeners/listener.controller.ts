// Listeners controller. Laravel: ListenerController + ListenerLessonController.

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { LmsListenerService } from '@/modules/lms/listeners/listener.service';

class ListenerListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // Laravel'da `per_page` cheklov yo'q.
  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_page?: number;
}

@ApiTags('LMS / Listeners')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/lms/listener')
export class LmsListenerController {
  constructor(private readonly service: LmsListenerService) {}

  @Get()
  @ApiOperation({ summary: 'Listener edu plans (stub)' })
  async index(@Query() q: ListenerListQueryDto) {
    return buildSuccess(true, await this.service.index(q));
  }

  @Get('lessons')
  @ApiOperation({ summary: 'Listener lessons (stub)' })
  async lessons(@Query() q: ListenerListQueryDto) {
    return buildSuccess(true, await this.service.lessons(q));
  }

  @Get('lessons/:lessonId')
  @ApiOperation({ summary: 'Start a listener lesson (stub)' })
  async startLesson(@Param('lessonId', ParseIntPipe) lessonId: number) {
    return buildSuccess(true, await this.service.startLesson(lessonId));
  }
}
