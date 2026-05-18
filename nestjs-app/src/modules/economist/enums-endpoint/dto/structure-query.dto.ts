// Structure endpoint uchun query DTO.
import { YearMonthQueryDto } from '@/modules/economist/_shared/dto/base-query.dto';

/**
 * GET /api/v1/economist/structure?year=&month=
 * Berilgan period uchun deadline'ni hisoblash va tashkilotlar daraxti.
 */
export class StructureQueryDto extends YearMonthQueryDto {}
