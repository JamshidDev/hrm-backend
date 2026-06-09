// DOCX'ga rasm (imzo) joylash — Laravel PhpWord TemplateProcessor::setImageValue
// ekvivalenti. NestJS xom XML (PizZip) bilan ishlagani uchun rasmni
// word/media'ga qo'shib, relationship + content-type qo'shib, `${key}`
// placeholder o'rniga inline <w:drawing> joylaymiz.

import PizZip from 'pizzip';

const EMU_PER_PX = 9525;

// `${key}` placeholder bo'laklarga bo'linib ketgan bo'lishi mumkin (Word run'lar).
// Oddiy `${key}` ko'rinishiga keltiramiz (xuddi fillTemplate kabi).
function normalizePlaceholder(xml: string, key: string): string {
  // <w:t>..${ ... key ... }..</w:t> orasidagi teglarni olib tashlash juda
  // murakkab; amalda placeholder bitta run'da bo'ladi. Agar bo'linган bo'lsa,
  // run-orasidagi teglarni ${...} ichida tozalaymiz.
  const re = new RegExp(`\\$\\{[^}]*?${key}[^}]*?\\}`, 'g');
  // Avval butun ${...} ni topib, ichidagi XML teglarini olib tashlaymiz.
  return xml
    .replace(/\$\{[^}]*\}/g, (m) => m.replace(/<[^>]+>/g, ''))
    .replace(re, `\${${key}}`);
}

// PNG rasmni DOCX ichiga `${key}` o'rniga inline image qilib joylaydi.
// width/height — piksel (PhpWord: 120x160). Topilmasa, DOCX o'zgarmasdan qaytadi.
export function injectDocxImage(
  docx: Buffer,
  key: string,
  png: Buffer,
  widthPx = 120,
  heightPx = 160,
): Buffer {
  const zip = new PizZip(docx);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) return docx;
  let xml = docXmlFile.asText();

  const placeholder = `\${${key}}`;
  if (!xml.includes(placeholder)) {
    xml = normalizePlaceholder(xml, key);
    if (!xml.includes(placeholder)) return docx; // placeholder yo'q
  }

  // 1) Rasmni word/media'ga qo'shamiz (noyob nom).
  const mediaName = `sig_${key}_${png.length}.png`;
  zip.file(`word/media/${mediaName}`, png, { binary: true });

  // 2) Relationship qo'shamiz (document.xml.rels).
  const relsPath = 'word/_rels/document.xml.rels';
  const relsFile = zip.file(relsPath);
  let rels = relsFile ? relsFile.asText() : '';
  // Noyob rId.
  let n = 900;
  while (rels.includes(`Id="rId${n}"`)) n++;
  const rId = `rId${n}`;
  const relNode = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/>`;
  rels = rels.replace('</Relationships>', `${relNode}</Relationships>`);
  zip.file(relsPath, rels);

  // 3) [Content_Types].xml ga png Default qo'shamiz (yo'q bo'lsa).
  const ctPath = '[Content_Types].xml';
  const ctFile = zip.file(ctPath);
  if (ctFile) {
    let ct = ctFile.asText();
    if (!/Extension="png"/i.test(ct)) {
      ct = ct.replace(
        '</Types>',
        '<Default Extension="png" ContentType="image/png"/></Types>',
      );
      zip.file(ctPath, ct);
    }
  }

  // 4) Inline drawing XML (PhpWord setImageValue kabi).
  const cx = widthPx * EMU_PER_PX;
  const cy = heightPx * EMU_PER_PX;
  const drawing =
    `</w:t></w:r>` +
    `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
    `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${n}" name="${key}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="${key}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r><w:r><w:t xml:space="preserve">`;

  // 5) Placeholder'ni drawing bilan almashtiramiz (faqat birinchisini emas — barchasini).
  xml = xml.split(placeholder).join(drawing);
  zip.file('word/document.xml', xml);

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}
