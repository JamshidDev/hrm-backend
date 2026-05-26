// OrganizationDocument service. Visibility scope: ALL / OWN / OWN_AND_BELOW.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { organization_documents, organizations } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  CreateOrganizationDocumentDto,
  OrganizationDocumentListResponseDto,
  QueryOrganizationDocumentDto,
  UpdateOrganizationDocumentDto,
} from '@/modules/hr/organization-documents/dto/organization-document.dto';

const DOC_TYPE_KEYS: Record<number, string> = {
  1: 'messages.organization_documents.one',
  2: 'messages.organization_documents.two',
  3: 'messages.organization_documents.three',
};

@Injectable()
export class OrganizationDocumentService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly scope: OrgScopeService,
  ) {}

  async findAll(
    filters: QueryOrganizationDocumentDto,
  ): Promise<OrganizationDocumentListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    const orgId = this.ctx.user?.organization_id ?? 0;

    // Laravel scopeVisibleToUser:
    //   visibility_type='ALL' OR
    //   (visibility_type='OWN' AND organization_id=userOrg) OR
    //   (visibility_type='OWN_AND_BELOW' AND organization_id IN [userOrg, ...children])
    // childIds — `Organization::getAllChildrenIds($orgId)` parity. NestJS'da
    // OrgScopeService.ids() — userning ruxsat etilgan org subtree IDlari.
    const subtreeIds = await this.scope.ids();
    const allOrgIds = subtreeIds.length > 0 ? subtreeIds : [orgId];

    // Optional search filter — Laravel `OrganizationDocumentIndexRequest` validates
    // `search` but the controller never applies it (latent bug). Bu yerda titrik
    // bo'yicha ham description bo'yicha ILIKE qo'shildi (extension — frontend
    // shu parametr bilan murojaat qiladi).
    const searchTerm = filters.search?.trim();
    const searchCond = searchTerm
      ? or(
          ilike(organization_documents.title, `%${searchTerm}%`),
          ilike(organization_documents.description, `%${searchTerm}%`),
        )
      : undefined;

    const where = and(
      isNull(organization_documents.deleted_at),
      or(
        eq(organization_documents.visibility_type, 'ALL'),
        and(
          eq(organization_documents.visibility_type, 'OWN'),
          eq(organization_documents.organization_id, orgId),
        ),
        and(
          eq(organization_documents.visibility_type, 'OWN_AND_BELOW'),
          inArray(organization_documents.organization_id, allOrgIds),
        ),
      ),
      searchCond,
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: organization_documents.id,
          file: organization_documents.file,
          title: organization_documents.title,
          description: organization_documents.description,
          type: organization_documents.type,
          visibility_type: organization_documents.visibility_type,
          document_date: organization_documents.document_date,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
        })
        .from(organization_documents)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, organization_documents.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(where)
        .orderBy(desc(organization_documents.created_at))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(organization_documents)
        .where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          organization: r.org_id
            ? {
                id: r.org_id,
                name:
                  lang === 'ru'
                    ? (r.org_name_ru ?? r.org_name)
                    : lang === 'en'
                      ? (r.org_name_en ?? r.org_name)
                      : r.org_name,
                group: r.org_group ?? false,
              }
            : null,
          file: await this.minio.fileUrl(r.file),
          title: r.title,
          description: r.description,
          type: {
            id: r.type,
            name: this.tr(DOC_TYPE_KEYS[r.type], lang),
          },
          visibility_type: r.visibility_type,
          document_date: r.document_date,
        })),
      ),
    };
  }

  private tr(key: string | undefined, lang: string): string {
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }

  // POST /api/v1/hr/organization-documents
  async create(
    dto: CreateOrganizationDocumentDto,
    file?: Express.Multer.File,
  ): Promise<void> {
    const userId = this.ctx.user_or_fail.id;
    const orgId = this.ctx.user_or_fail.organization_id;
    if (!orgId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }

    const filePath = await this.resolveDocFile(file, dto.file);

    await this.db.insert(organization_documents).values({
      organization_id: orgId,
      user_id: userId,
      file: filePath,
      document_date: dto.document_date ?? null,
      type: dto.type,
      visibility_type: dto.visibility_type ?? 'OWN',
      title: dto.title,
      description: dto.description ?? null,
    });
  }

  // PUT /api/v1/hr/organization-documents/{id}
  async update(
    id: number,
    dto: UpdateOrganizationDocumentDto,
    file?: Express.Multer.File,
  ): Promise<void> {
    const [row] = await this.db
      .select({
        id: organization_documents.id,
        file: organization_documents.file,
      })
      .from(organization_documents)
      .where(
        and(
          eq(organization_documents.id, id),
          notDeleted(organization_documents),
        ),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Yangi fayl berilsa — yangilanadi, aks holda eski fayl saqlanadi.
    const filePath = (await this.resolveDocFile(file, dto.file)) ?? row.file;

    await this.db
      .update(organization_documents)
      .set({
        file: filePath,
        document_date: dto.document_date ?? null,
        type: dto.type,
        visibility_type: dto.visibility_type ?? 'OWN',
        title: dto.title,
        description: dto.description ?? null,
        updated_at: sql`NOW()`,
      })
      .where(eq(organization_documents.id, id));
  }

  // DELETE /api/v1/hr/organization-documents/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: organization_documents.id })
      .from(organization_documents)
      .where(
        and(
          eq(organization_documents.id, id),
          notDeleted(organization_documents),
        ),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(organization_documents)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(organization_documents.id, id));
  }

  // Faylni MinIO yo'liga aylantirish: multipart fayl → uploadFormFile,
  // base64 → uploadBase64File, aks holda dto'dagi string yo'l (yoki null).
  // Laravel: uploadFormFile($file, 'organization-documents', getFileTypes('document')).
  private async resolveDocFile(
    file: Express.Multer.File | undefined,
    dtoFile: string | undefined,
  ): Promise<string | null> {
    if (file) {
      return this.minio.uploadFormFile(
        {
          originalname: file.originalname,
          buffer: file.buffer,
          mimetype: file.mimetype,
          size: file.size,
        },
        'organization-documents',
        ['pdf', 'doc', 'docx', 'xlsx', 'xls'],
        null,
        10,
      );
    }
    if (dtoFile && dtoFile.startsWith('data:')) {
      return this.minio.uploadBase64File(
        dtoFile,
        'organization-documents',
        ['pdf', 'jpg', 'jpeg', 'png', 'docx'],
        10240,
      );
    }
    return dtoFile ?? null;
  }
}
