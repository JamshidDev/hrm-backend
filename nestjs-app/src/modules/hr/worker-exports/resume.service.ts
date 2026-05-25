// Resume DOCX generator. Laravel: App\Helpers\WorkerResumeHelper.
//
// Template: public/resumes/resume_latin.docx — uses `${var}` placeholders.
// Loop placeholders (`career_date`, `relative`) Laravel `cloneRowAndSetValues`
// orqali parent element (paragraph yoki table row)'ni klonlaydi. Bu yerda bizda
// `${var}` Word ichida bir nechta `<w:r><w:t>` runlarga bo'lingan — shuning uchun
// avval normalize qilamiz (placeholder'ni bitta `<w:t>` ichiga yig'amiz), keyin
// parent element'ni topib N marta klonlaymiz.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { readFile } from 'fs/promises';
import { join } from 'path';
import PizZip from 'pizzip';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  workers,
  worker_positions,
  worker_relatives,
  worker_languages,
  worker_universities,
  worker_old_careers,
  worker_academic_degrees,
  worker_academic_titles,
  worker_parties,
  universities as universitiesTable,
  specialities as specialitiesTable,
  languages as languagesTable,
  organizations,
  departments,
  positions as positionsTable,
  regions,
  cities,
  nationalities,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { BusinessException } from '@/common/exceptions/business.exception';

const POSITION_STATUS_ACTIVE = 2;

@Injectable()
export class ResumeService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async generate(uuid: string): Promise<{ buffer: Buffer; filename: string }> {
    const [wp] = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
        position_date: worker_positions.position_date,
        org_full_name: organizations.full_name,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_name: positionsTable.name,
      })
      .from(worker_positions)
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, worker_positions.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .where(and(eq(worker_positions.uuid, uuid), notDeleted(worker_positions)))
      .limit(1);

    if (!wp || !wp.worker_id) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const wid = wp.worker_id;
    const [w] = await this.db
      .select()
      .from(workers)
      .where(eq(workers.id, wid))
      .limit(1);
    if (!w) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const [
      regionRow,
      cityRow,
      nationalityRow,
      relatives,
      languagesRows,
      universities,
      oldCareers,
      allPositions,
      academicDegree,
      academicTitle,
      party,
    ] = await Promise.all([
      w.region_id
        ? this.db
            .select({ name: regions.name })
            .from(regions)
            .where(eq(regions.id, w.region_id))
            .limit(1)
        : Promise.resolve([]),
      w.city_id
        ? this.db
            .select({ name: cities.name })
            .from(cities)
            .where(eq(cities.id, w.city_id))
            .limit(1)
        : Promise.resolve([]),
      w.nationality_id
        ? this.db
            .select({ name: nationalities.name })
            .from(nationalities)
            .where(eq(nationalities.id, w.nationality_id))
            .limit(1)
        : Promise.resolve([]),
      this.db
        .select({
          relative: worker_relatives.relative,
          birthday: worker_relatives.birthday,
          last_name: worker_relatives.last_name,
          first_name: worker_relatives.first_name,
          middle_name: worker_relatives.middle_name,
          birth_place: worker_relatives.birth_place,
          post_name: worker_relatives.post_name,
          address: worker_relatives.address,
        })
        .from(worker_relatives)
        .where(
          and(
            eq(worker_relatives.worker_id, wid),
            notDeleted(worker_relatives),
          ),
        )
        .orderBy(asc(worker_relatives.sort), asc(worker_relatives.id)),
      this.db
        .select({ name: languagesTable.name })
        .from(worker_languages)
        .leftJoin(
          languagesTable,
          eq(languagesTable.id, worker_languages.language_id),
        )
        .where(
          and(
            eq(worker_languages.worker_id, wid),
            notDeleted(worker_languages),
          ),
        ),
      this.db
        .select({
          to_date: worker_universities.to_date,
          speciality_name: specialitiesTable.name,
          university_name: universitiesTable.name,
        })
        .from(worker_universities)
        .leftJoin(
          universitiesTable,
          eq(universitiesTable.id, worker_universities.university_id),
        )
        .leftJoin(
          specialitiesTable,
          eq(specialitiesTable.id, worker_universities.speciality_id),
        )
        .where(
          and(
            eq(worker_universities.worker_id, wid),
            notDeleted(worker_universities),
          ),
        ),
      this.db
        .select({
          from_date: worker_old_careers.from_date,
          to_date: worker_old_careers.to_date,
          post_name: worker_old_careers.post_name,
          sort: worker_old_careers.sort,
        })
        .from(worker_old_careers)
        .where(
          and(
            eq(worker_old_careers.worker_id, wid),
            notDeleted(worker_old_careers),
          ),
        )
        .orderBy(asc(worker_old_careers.sort)),
      this.db
        .select({
          status: worker_positions.status,
          position_date: worker_positions.position_date,
          org_full_name: organizations.full_name,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
        })
        .from(worker_positions)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, worker_positions.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .where(
          and(
            eq(worker_positions.worker_id, wid),
            notDeleted(worker_positions),
          ),
        )
        .orderBy(asc(worker_positions.position_date)),
      this.db
        .select({ type: worker_academic_degrees.type })
        .from(worker_academic_degrees)
        .where(
          and(
            eq(worker_academic_degrees.worker_id, wid),
            notDeleted(worker_academic_degrees),
          ),
        )
        .limit(1),
      this.db
        .select({ type: worker_academic_titles.type })
        .from(worker_academic_titles)
        .where(
          and(
            eq(worker_academic_titles.worker_id, wid),
            notDeleted(worker_academic_titles),
          ),
        )
        .limit(1),
      // Laravel Worker::party() HasOne — ->orderByDesc('id') (eng so'nggi yozuv).
      this.db
        .select({ party: worker_parties.party })
        .from(worker_parties)
        .where(
          and(eq(worker_parties.worker_id, wid), notDeleted(worker_parties)),
        )
        .orderBy(desc(worker_parties.id))
        .limit(1),
    ]);

    // ---- Build data ----
    const fullName = this.fullName(w.last_name, w.first_name, w.middle_name);
    const birthAddress = `${regionRow[0]?.name ?? ''}, ${cityRow[0]?.name ?? ''}`;
    const birthday = this.fmtDmy(w.birthday);

    const universityParts: string[] = [];
    const specialityParts: string[] = [];
    for (const u of universities) {
      if (u.university_name) {
        universityParts.push(
          `${this.year(u.to_date)}-yil, ${u.university_name}`,
        );
        specialityParts.push(u.speciality_name ?? '');
      }
    }
    const languagesStr = languagesRows
      .map((l) => l.name)
      .filter((n): n is string => !!n)
      .join(',');

    const careers: Array<Record<string, string>> = [];
    for (const c of oldCareers) {
      careers.push({
        career_date: `${this.year(c.from_date)}-${this.year(c.to_date)} yy`,
        career_name: c.post_name ?? '',
      });
    }
    for (let i = 0; i < allPositions.length; i++) {
      const p = allPositions[i];
      const postName = this.fullPosition(
        p.org_full_name,
        p.dept_name,
        p.dept_level,
        p.pos_name,
      );
      const from = this.year(p.position_date);
      let to: string;
      if (p.status === POSITION_STATUS_ACTIVE) to = 'h.v';
      else {
        const next = allPositions[i + 1];
        to = next ? `${this.year(next.position_date)} yy` : from;
      }
      careers.push({ career_date: `${from}-${to}`, career_name: postName });
    }

    const relativesData: Array<Record<string, string>> = relatives.map((r) => {
      const fn = this.fullName(r.last_name, r.first_name, r.middle_name);
      const birthPlace = r.birthday
        ? `${this.year(r.birthday)}-yil, ${r.birth_place ?? ''}`
        : (r.birth_place ?? '');
      return {
        relative: this.relativeLabel(r.relative),
        relative_full_name: fn,
        relative_birth_info: birthPlace,
        relative_post_name: r.post_name ?? '',
        relative_address: (r.address ?? '').replace(/[<>]/g, ' '),
      };
    });

    const scalars: Record<string, string> = {
      full_name: fullName,
      birthday,
      birth_address: birthAddress,
      position_date: this.positionDateLong(wp.position_date),
      full_position_name: this.fullPosition(
        wp.org_full_name,
        wp.dept_name,
        wp.dept_level,
        wp.pos_name,
      ),
      nationality: nationalityRow[0]?.name ?? '',
      party: party[0]?.party != null ? this.partyLabel(party[0].party) : "Yo'q",
      education: this.educationLabel(w.education),
      universities: universityParts.join(', '),
      specialities: specialityParts.join(', '),
      academic_degree:
        academicDegree[0] != null
          ? this.academicDegreeLabel(academicDegree[0].type)
          : '',
      academic_title:
        academicTitle[0] != null
          ? this.academicTitleLabel(academicTitle[0].type)
          : '',
      languages: languagesStr,
      incentives: 'taqdirlanmagan',
      military: '',
      deputy: '',
      photo: '',
    };

    // ---- Render DOCX ----
    const templatePath = join(
      process.cwd(),
      'public',
      'resumes',
      'resume_latin.docx',
    );
    const content = await readFile(templatePath);
    const zip = new PizZip(content);
    const xmlFile = zip.file('word/document.xml');
    if (!xmlFile) {
      throw new BusinessException(500, 'document.xml topilmadi');
    }
    let xml = xmlFile.asText();

    // 1) Normalize ${var} placeholders split across <w:r><w:t> runs.
    xml = this.normalizePlaceholders(xml);

    // 2) Expand loops (clone parent element per item).
    xml = this.expandLoop(xml, ['career_date', 'career_name'], careers, 'w:tr');
    xml = this.expandLoop(
      xml,
      [
        'relative',
        'relative_full_name',
        'relative_birth_info',
        'relative_post_name',
        'relative_address',
      ],
      relativesData,
      'w:tr',
    );

    // 3) Substitute scalars.
    for (const [k, v] of Object.entries(scalars)) {
      xml = xml.split(`\${${k}}`).join(this.escapeXml(v));
    }

    zip.file('word/document.xml', xml);
    const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    const filename = `${this.slug(fullName)}.docx`;
    return { buffer, filename };
  }

  // ---- Template engine helpers ----

  // Merge `${var}` placeholders that Word splits across multiple `<w:t>` runs.
  // Example input:
  //   <w:t>${career</w:t></w:r><w:r...><w:t>_</w:t></w:r><w:r...><w:t>date}</w:t>
  // Output:
  //   <w:t>${career_date}</w:t>  (intermediate runs olinib tashlanadi)
  private normalizePlaceholders(xml: string): string {
    // Approach: extract `<w:t>...</w:t>` text contents in document order, find
    // `${...}` placeholders spanning multiple `<w:t>`, and merge those runs by
    // concatenating their texts into the first `<w:t>` and emptying subsequent
    // ones (without removing the surrounding run XML, which keeps formatting).
    // Match only the `<w:t>` element (not `<w:tab>`, `<w:tbl>`, etc.).
    const tagRe = /<w:t(\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    const matches: Array<{
      start: number;
      end: number;
      text: string;
      attrs: string;
    }> = [];
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(xml)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        text: m[2],
        attrs: m[1] ?? '',
      });
    }
    if (matches.length === 0) return xml;

    // Concatenate all texts with index offsets so we can map back.
    const fullText = matches.map((mm) => mm.text).join('');
    // Build prefix sum: textIdx → match index.
    const offsets: number[] = [];
    let cursor = 0;
    for (const mm of matches) {
      offsets.push(cursor);
      cursor += mm.text.length;
    }
    const findMatchFor = (textIdx: number): number => {
      let lo = 0;
      let hi = matches.length - 1;
      let ans = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (offsets[mid] <= textIdx) {
          ans = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return ans;
    };

    // For each `${...}` in fullText, merge spanning <w:t> runs.
    const phRe = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const merges: Array<{ first: number; last: number; merged: string }> = [];
    let pm: RegExpExecArray | null;
    while ((pm = phRe.exec(fullText)) !== null) {
      const startIdx = pm.index;
      const endIdx = pm.index + pm[0].length - 1;
      const firstMatch = findMatchFor(startIdx);
      const lastMatch = findMatchFor(endIdx);
      if (firstMatch === lastMatch) continue;
      // Merged text: everything from startIdx to endIdx+1 in fullText, plus
      // surrounding text in the first/last `<w:t>` (before placeholder in first,
      // after placeholder in last gets pushed to first too — keep things simple).
      // We collect text from firstMatch.text up to/including the placeholder,
      // then text from lastMatch.text after the placeholder end gets appended.
      // But typically placeholders are surrounded by run boundaries with no
      // adjacent text, so this is safe.
      const firstWtStart = offsets[firstMatch];
      const lastWtStart = offsets[lastMatch];
      const firstWtEnd = firstWtStart + matches[firstMatch].text.length;
      const lastWtEnd = lastWtStart + matches[lastMatch].text.length;

      const preFirst = matches[firstMatch].text.slice(
        0,
        startIdx - firstWtStart,
      );
      const postLast = matches[lastMatch].text.slice(endIdx + 1 - lastWtStart);
      const middleText = fullText.slice(startIdx, endIdx + 1);
      const mergedFirstText = preFirst + middleText + postLast;
      merges.push({
        first: firstMatch,
        last: lastMatch,
        merged: mergedFirstText,
      });
      // Skip ahead past this placeholder.
      phRe.lastIndex = endIdx + 1;
      // Suppress unused-var warnings (preserved to keep mapping clear).
      void firstWtEnd;
      void lastWtEnd;
    }

    if (merges.length === 0) return xml;

    // Apply merges. Iterate from rightmost merge to leftmost to preserve indices.
    let result = xml;
    for (let i = merges.length - 1; i >= 0; i--) {
      const { first, last, merged } = merges[i];
      // Replace first <w:t>...</w:t> with merged content.
      const firstMatch = matches[first];
      const newFirst = `<w:t${firstMatch.attrs.includes('xml:space') ? firstMatch.attrs : `${firstMatch.attrs} xml:space="preserve"`}>${merged}</w:t>`;
      // Empty subsequent <w:t> elements (first+1 .. last).
      // We do this right-to-left so positions remain valid.
      for (let j = last; j > first; j--) {
        const mm = matches[j];
        const emptied = `<w:t${mm.attrs}></w:t>`;
        result = result.slice(0, mm.start) + emptied + result.slice(mm.end);
      }
      result =
        result.slice(0, firstMatch.start) +
        newFirst +
        result.slice(firstMatch.end);
    }
    return result;
  }

  // For each loop marker, find the enclosing element (parentTag — 'w:p' or 'w:tr')
  // containing any of `markers`. Clone it once per item, substituting markers with values.
  private expandLoop(
    xml: string,
    markers: string[],
    items: Array<Record<string, string>>,
    parentTag: 'w:p' | 'w:tr',
  ): string {
    // Find first occurrence of ANY marker placeholder.
    const markerPattern = markers.map((m) => `\\$\\{${m}\\}`).join('|');
    const re = new RegExp(markerPattern);
    const m = re.exec(xml);
    if (!m) return xml;

    // Walk back from m.index to find enclosing parent element.
    const openTag = `<${parentTag}`;
    const closeTag = `</${parentTag}>`;
    const start = xml.lastIndexOf(openTag, m.index);
    if (start < 0) return xml;
    // Find the end of the parent element.
    const end = xml.indexOf(closeTag, m.index);
    if (end < 0) return xml;
    const parentXml = xml.slice(start, end + closeTag.length);

    if (items.length === 0) {
      // Remove the parent element entirely.
      return xml.slice(0, start) + xml.slice(end + closeTag.length);
    }

    // Clone for each item, substituting markers.
    const clones: string[] = [];
    for (const item of items) {
      let clone = parentXml;
      for (const marker of markers) {
        clone = clone
          .split(`\${${marker}}`)
          .join(this.escapeXml(item[marker] ?? ''));
      }
      clones.push(clone);
    }
    return (
      xml.slice(0, start) + clones.join('') + xml.slice(end + closeTag.length)
    );
  }

  private escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ---- Data formatters ----

  private fullName(
    last: string | null,
    first: string | null,
    middle: string | null,
  ): string {
    return [last, first, middle].filter(Boolean).join(' ');
  }

  private year(d: string | null | undefined): string {
    if (!d) return '';
    const m = /^(\d{4})/.exec(d);
    return m ? m[1] : '';
  }

  private fmtDmy(d: string | null | undefined): string {
    if (!d) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : d;
  }

  private fullPosition(
    orgFullName: string | null,
    deptName: string | null,
    deptLevel: number | null,
    posName: string | null,
  ): string {
    if (!posName) return '';
    let position = posName;
    if (deptLevel !== 1 && deptName) position = `${deptName} ${position}`;
    return `${orgFullName ?? ''} ${position}`.trim();
  }

  private slug(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private positionDateLong(d: string | null): string {
    if (!d) return '';
    const dt = new Date(d);
    const months = [
      'yanvar',
      'fevral',
      'mart',
      'aprel',
      'may',
      'iyun',
      'iyul',
      'avgust',
      'sentyabr',
      'oktyabr',
      'noyabr',
      'dekabr',
    ];
    return `${dt.getFullYear()}-yil ${dt.getDate()}-${months[dt.getMonth()]}dan`;
  }

  private relativeLabel(v: number | null): string {
    const map: Record<number, string> = {
      1: 'Otasi',
      2: 'Onasi',
      3: 'Akasi',
      4: 'Opasi',
      5: "Turmush o'rtog'i",
      6: 'Ukasi',
      7: 'Singlisi',
      8: "O'g'li",
      9: 'Qizi',
      10: 'Qaynotasi',
      11: 'Qaynonasi',
      12: 'Qaynakasi',
      13: 'Qaynopasi',
      14: 'Qaynukasi',
      15: 'Qaynsingli',
    };
    return v != null ? (map[v] ?? '') : '';
  }

  private educationLabel(v: number | null): string {
    const map: Record<number, string> = {
      1: 'Oliy',
      2: "O'rta maxsus",
      3: "O'rta",
    };
    return v != null ? (map[v] ?? '') : '';
  }

  private academicDegreeLabel(v: number): string {
    const map: Record<number, string> = {
      1: 'PhD',
      2: 'DSc',
      3: 'Nomzod',
      4: 'Doktor',
    };
    return map[v] ?? '';
  }

  private academicTitleLabel(v: number): string {
    const map: Record<number, string> = {
      1: 'Dotsent',
      2: 'Professor',
      3: 'Akademik',
      4: 'Mualim',
    };
    return map[v] ?? '';
  }

  // Laravel PartyEnum::get — 2/3/4/5 siyosiy partiya kalitlari, aks holda "".
  private partyLabel(v: number): string {
    const keys: Record<number, string> = {
      2: 'two',
      3: 'three',
      4: 'four',
      5: 'five',
    };
    const key = keys[v];
    return key ? this.i18n.t(`messages.worker.political_party.${key}`) : '';
  }
}
