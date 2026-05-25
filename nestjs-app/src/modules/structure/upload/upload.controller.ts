// Upload endpoint. Laravel: POST /api/v1/structure/upload.
// Multipart form-data: file=<binary>.

import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { UploadService } from '@/modules/structure/upload/upload.service';

@ApiTags('Structure / Upload')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure/upload')
export class UploadController {
  constructor(private readonly service: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload generic file (pdf, docx, jpg, png) — returns signed URL',
  })
  @ApiOkResponse()
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<string> {
    return this.service.upload(file);
  }
}
