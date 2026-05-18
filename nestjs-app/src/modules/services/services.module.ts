// ProjectService module — Laravel: Modules/ProjectService (2 routes).
// Single endpoint: POST /api/v1/services/translate
// Laravel implementation calls local LibreOffice/Pandoc binaries. Stub here.

import { Body, Controller, Module, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { AuthModule } from '@/modules/auth/auth.module';

@ApiTags('Services')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/services')
class ServicesController {
  @Post('translate')
  @ApiOperation({ summary: 'Translate document (LibreOffice/Pandoc stub)' })
  async translate(@Body() _body: any) {
    // Laravel returns scalar `1` on success — we return success object.
    return buildSuccess(true, 1);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ServicesController],
})
export class ServicesModule {}
