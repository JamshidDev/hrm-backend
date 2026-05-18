// Dashboard endpoint uchun query DTO.
import { YearMonthQueryDto } from '@/modules/economist/_shared/dto/base-query.dto';

/**
 * GET /api/v1/economist/dashboard?year=&month=
 * year/month — 8 oy ortga sanash uchun boshlang'ich nuqta (default: joriy).
 */
export class DashboardQueryDto extends YearMonthQueryDto {}
