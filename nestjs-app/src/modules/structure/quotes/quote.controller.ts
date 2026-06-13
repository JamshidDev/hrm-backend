import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { QuoteService } from '@/modules/structure/quotes/quote.service';
import {
  QueryQuoteDto,
  QuoteListResponseDto,
  CreateQuoteDto,
  UpdateQuoteDto,
} from '@/modules/structure/quotes/dto/quote.dto';
import { validateQuoteStore } from '@/modules/structure/quotes/quote.validation';

// CRUD endpointlar — Laravel /api/v1/structure/quotes
@ApiTags('Structure / Quotes')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure/quotes')
export class QuoteController {
  constructor(
    private readonly service: QuoteService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Quotes list' })
  @ApiOkResponse({ type: QuoteListResponseDto })
  async findAll(@Query() query: QueryQuoteDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Create quote' })
  @ApiBody({ type: CreateQuoteDto })
  @ApiOkResponse()
  // @Body() loose tip — global ValidationPipe skip qiladi; nested-required
  // validatsiyani Laravel-format'da qo'lda quramiz (validateQuoteStore).
  async create(@Body() body: Record<string, unknown>) {
    validateQuoteStore(body);
    await this.service.create(body as unknown as CreateQuoteDto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Update quote' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuoteDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Delete quote (soft)' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}

// Random quote — Laravel /api/v1/quote (structure prefix EMAS).
@ApiTags('Structure / Quotes')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/quote')
export class QuoteRandomController {
  constructor(private readonly service: QuoteService) {}

  @Get()
  @ApiOperation({ summary: 'Random quote' })
  @ApiOkResponse()
  async findRandom() {
    return this.service.findRandom();
  }
}
