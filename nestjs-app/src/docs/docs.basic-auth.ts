// /api/docs/* sahifalarini bitta umumiy parol bilan himoyalovchi basic-auth middleware.
// Foydalanuvchi nomi e'tiborga olinmaydi — faqat parol tekshiriladi (DOCS_PASSWORD).
// Parol .env'da: DOCS_PASSWORD (berilmasa lokal uchun default).

import type { Request, Response, NextFunction } from 'express';

const DOCS_PASSWORD = process.env.DOCS_PASSWORD ?? 'hrm-docs';

export function docsBasicAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization ?? '';
  if (header.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const password = decoded.slice(decoded.indexOf(':') + 1);
    if (password === DOCS_PASSWORD) {
      next();
      return;
    }
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="HRM API Docs"');
  res.status(401).send('Authentication required');
}
