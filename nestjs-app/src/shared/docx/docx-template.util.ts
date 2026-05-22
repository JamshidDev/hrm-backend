// DOCX shablon yordamchilari — `${placeholder}` normalizatsiya, escape va
// rasm joylash. Word `${var}` larni bir nechta `<w:t>` run'ga bo'lib yuboradi —
// shu sabab oldin normalize qilish kerak.

import type PizZip from 'pizzip';

// XML maxsus belgilarini escape qilish.
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// `${var}` bir nechta `<w:t>` run'ga bo'lingan bo'lsa — bittaga birlashtiradi.
export function normalizePlaceholders(xml: string): string {
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

  const fullText = matches.map((mm) => mm.text).join('');
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

  const phRe = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  const merges: Array<{ first: number; last: number; merged: string }> = [];
  let pm: RegExpExecArray | null;
  while ((pm = phRe.exec(fullText)) !== null) {
    const startIdx = pm.index;
    const endIdx = pm.index + pm[0].length - 1;
    const firstMatch = findMatchFor(startIdx);
    const lastMatch = findMatchFor(endIdx);
    if (firstMatch === lastMatch) continue;
    const firstWtStart = offsets[firstMatch];
    const lastWtStart = offsets[lastMatch];
    const preFirst = matches[firstMatch].text.slice(0, startIdx - firstWtStart);
    const postLast = matches[lastMatch].text.slice(endIdx + 1 - lastWtStart);
    const middleText = fullText.slice(startIdx, endIdx + 1);
    merges.push({
      first: firstMatch,
      last: lastMatch,
      merged: preFirst + middleText + postLast,
    });
    phRe.lastIndex = endIdx + 1;
  }
  if (merges.length === 0) return xml;

  let result = xml;
  for (let i = merges.length - 1; i >= 0; i--) {
    const { first, last, merged } = merges[i];
    const firstMatch = matches[first];
    const attrs = firstMatch.attrs.includes('xml:space')
      ? firstMatch.attrs
      : `${firstMatch.attrs} xml:space="preserve"`;
    const newFirst = `<w:t${attrs}>${merged}</w:t>`;
    for (let j = last; j > first; j--) {
      const mm = matches[j];
      result =
        result.slice(0, mm.start) +
        `<w:t${mm.attrs}></w:t>` +
        result.slice(mm.end);
    }
    result =
      result.slice(0, firstMatch.start) +
      newFirst +
      result.slice(firstMatch.end);
  }
  return result;
}

export interface EmbedImageOptions {
  placeholder: string; // masalan 'photo'
  buffer: Buffer;
  ext: 'png' | 'jpg' | 'jpeg';
  mediaName: string; // word/media/{mediaName}.{ext}
  relId: string; // noyob, masalan 'rId950'
  docPrId: number; // noyob drawing id
  cx: number; // kenglik (EMU)
  cy: number; // balandlik (EMU)
}

const CONTENT_TYPE: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

// `${placeholder}` matnini inline rasm (`<w:drawing>`) bilan almashtiradi.
// zip'ga media fayl, [Content_Types].xml va relationship qo'shiladi.
export function embedImageIntoZip(
  zip: PizZip,
  xml: string,
  opts: EmbedImageOptions,
): string {
  const token = `\${${opts.placeholder}}`;
  if (!xml.includes(token)) return xml;

  const target = `media/${opts.mediaName}.${opts.ext}`;

  // 1) Rasmni zip ichiga.
  zip.file(`word/${target}`, opts.buffer);

  // 2) [Content_Types].xml — kerakli Default extension.
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ct = ctFile.asText();
    if (!ct.includes(`Extension="${opts.ext}"`)) {
      ct = ct.replace(
        '</Types>',
        `<Default Extension="${opts.ext}" ContentType="${CONTENT_TYPE[opts.ext]}"/></Types>`,
      );
      zip.file('[Content_Types].xml', ct);
    }
  }

  // 3) document.xml.rels — image relationship.
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (relsFile) {
    let rels = relsFile.asText();
    if (!rels.includes(`Id="${opts.relId}"`)) {
      rels = rels.replace(
        '</Relationships>',
        `<Relationship Id="${opts.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/></Relationships>`,
      );
      zip.file('word/_rels/document.xml.rels', rels);
    }
  }

  // 4) `<w:t...>${placeholder}</w:t>` ni `<w:drawing>` bilan almashtirish.
  const drawing =
    `<w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${opts.cx}" cy="${opts.cy}"/>` +
    `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${opts.docPrId}" name="${opts.placeholder}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="${opts.docPrId}" name="${opts.placeholder}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${opts.relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${opts.cx}" cy="${opts.cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;

  const re = new RegExp(
    `<w:t(?:\\s+[^>]*)?>\\$\\{${opts.placeholder}\\}</w:t>`,
  );
  return xml.replace(re, drawing);
}
