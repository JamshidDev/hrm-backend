// OnlyOffice controller. Laravel: routes/api.php inline GET /only-office/file/:uuid.
// Laravel: `signed` middleware — URL imzosini tekshiradi (HMAC).
// OnlyOffice Document Server bu endpointga kelib hujjat (DOCX) xom faylini yuklab oladi.

import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { OnlyOfficeService } from '@/modules/only-office/only-office.service';

@ApiTags('OnlyOffice')
@Controller('api/only-office')
export class OnlyOfficeController {
  constructor(private readonly service: OnlyOfficeService) {}

  @Public()
  @Get('file/:uuid')
  @ApiOperation({
    summary:
      'OnlyOffice file download (Laravel: signed URL middleware + MinIO stream)',
  })
  async getFile(
    @Param('uuid') uuid: string,
    @Query('model') model: string | undefined,
    @Query('expires') expires: string | undefined,
    @Query('signature') signature: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.service.getFile(uuid, {
      model,
      expires,
      signature,
    });
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${file.fileName}"`,
    );
    res.setHeader('Content-Length', String(file.buffer.length));
    res.end(file.buffer);
  }
}
