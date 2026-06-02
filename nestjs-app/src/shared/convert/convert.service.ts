// DOCX → PDF konvertatsiya. Laravel: App\Helpers\ConvertHelper::docxToPdf.
//
// Laravel LibreOffice CLI ishlatadi (`soffice --convert-to pdf` / `unoconv`).
// NestJS'da ham xuddi shu — `soffice --headless --convert-to pdf`.

import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BusinessException } from '@/common/exceptions/business.exception';

const execFileAsync = promisify(execFile);

// LibreOffice `soffice` binary — platforma bo'yicha.
const SOFFICE_CANDIDATES = [
  '/Applications/LibreOffice.app/Contents/MacOS/soffice', // macOS
  '/usr/bin/soffice', // Linux
  '/usr/bin/libreoffice',
  'soffice', // PATH'da bo'lsa
];

@Injectable()
export class ConvertService {
  private readonly logger = new Logger(ConvertService.name);

  private resolveSoffice(): string {
    for (const c of SOFFICE_CANDIDATES) {
      if (c === 'soffice' || existsSync(c)) return c;
    }
    return 'soffice';
  }

  // DOCX buffer → PDF buffer (LibreOffice headless orqali).
  async docxToPdf(docxBuffer: Buffer): Promise<Buffer> {
    const soffice = this.resolveSoffice();
    const dir = await mkdtemp(join(tmpdir(), 'hrm-convert-'));
    const docxPath = join(dir, 'in.docx');
    const pdfPath = join(dir, 'in.pdf');

    try {
      await writeFile(docxPath, docxBuffer);
      // `-env:UserInstallation` — har bir chaqiruvga alohida profil; profil
      // lock konflikti (server muhitida klassik soffice bug) oldini oladi.
      //
      // PDF filtri — `writer_pdf_Export` JSON opsiyalari bilan (LibreOffice 7.4+):
      //   ReduceImageResolution=false — rasmlar downsample qilinmaydi (default 300 DPI
      //     gacha siqib qo'yardi → banner/QR/foto xira chiqardi).
      //   UseLosslessCompression=true — JPEG o'rniga lossless (PNG) siqish; JPEG
      //     artefaktlari yo'qoladi, rasm ichidagi matn aniq qoladi.
      const pdfFilter =
        'pdf:writer_pdf_Export:{"ReduceImageResolution":{"type":"boolean","value":false},"UseLosslessCompression":{"type":"boolean","value":true}}';
      const { stdout, stderr } = await execFileAsync(
        soffice,
        [
          `-env:UserInstallation=file://${join(dir, 'lo-profile')}`,
          '--headless',
          '--invisible',
          '--nologo',
          '--nolockcheck',
          '--nofirststartwizard',
          '--convert-to',
          pdfFilter,
          '--outdir',
          dir,
          docxPath,
        ],
        { timeout: 90_000 },
      );

      if (!existsSync(pdfPath)) {
        this.logger.error(
          `docxToPdf: PDF yaratilmadi. stdout=${stdout} stderr=${stderr}`,
        );
        throw new BusinessException(
          500,
          'PDF konvertatsiya muvaffaqiyatsiz tugadi',
        );
      }
      return await readFile(pdfPath);
    } catch (err) {
      this.logger.error('docxToPdf failed', err as Error);
      if (err instanceof BusinessException) throw err;
      throw new BusinessException(
        500,
        'PDF konvertatsiya xatosi (LibreOffice topilmadi yoki ishlamadi)',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  // XLSX buffer → PDF buffer (LibreOffice Calc). Laravel: ConvertHelper::docxToPdf
  // staffing-approve `.xlsx` faylni PDF'ga aylantiradi (nom docxToPdf bo'lsa-da, kirish xlsx).
  async xlsxToPdf(xlsxBuffer: Buffer): Promise<Buffer> {
    const soffice = this.resolveSoffice();
    const dir = await mkdtemp(join(tmpdir(), 'hrm-convert-'));
    const xlsxPath = join(dir, 'in.xlsx');
    const pdfPath = join(dir, 'in.pdf');

    try {
      await writeFile(xlsxPath, xlsxBuffer);
      // Calc PDF filtri — rasm (QR) sifatini saqlash uchun lossless + downsample yo'q.
      const pdfFilter =
        'pdf:calc_pdf_Export:{"ReduceImageResolution":{"type":"boolean","value":false},"UseLosslessCompression":{"type":"boolean","value":true}}';
      const { stdout, stderr } = await execFileAsync(
        soffice,
        [
          `-env:UserInstallation=file://${join(dir, 'lo-profile')}`,
          '--headless',
          '--invisible',
          '--nologo',
          '--nolockcheck',
          '--nofirststartwizard',
          '--convert-to',
          pdfFilter,
          '--outdir',
          dir,
          xlsxPath,
        ],
        { timeout: 90_000 },
      );

      if (!existsSync(pdfPath)) {
        this.logger.error(
          `xlsxToPdf: PDF yaratilmadi. stdout=${stdout} stderr=${stderr}`,
        );
        throw new BusinessException(
          500,
          'PDF konvertatsiya muvaffaqiyatsiz tugadi',
        );
      }
      return await readFile(pdfPath);
    } catch (err) {
      this.logger.error('xlsxToPdf failed', err as Error);
      if (err instanceof BusinessException) throw err;
      throw new BusinessException(
        500,
        'PDF konvertatsiya xatosi (LibreOffice topilmadi yoki ishlamadi)',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
