// Multipart store validatsiyasi — Laravel CommandTypeController::store parity:
//   'type' => 'required', 'organizations' => 'required', 'file' => 'required|mimes:doc,docx'
//
// Standart ValidationPipe multipart + UploadedFile bilan birga ishlamaydi (file
// @Body() ichida emas), shuning uchun qo'lda LaravelValidationException quramiz —
// xato tartibi (type → organizations → file) va lokalizatsiya filterda.

import type { ValidationError } from 'class-validator';
import { LaravelValidationException } from '@/common/exceptions/validation.exception';

const ALLOWED_EXTS = ['doc', 'docx'];

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || v === '';
}

function requiredError(property: string): ValidationError {
  // `isNotEmpty` → builder uni `required` rule'iga map qiladi (xabar e'tiborsiz).
  return { property, constraints: { isNotEmpty: 'required' } };
}

// Laravel `mimes:doc,docx` faqat fayl mavjud bo'lganda fail bo'ladi (yo'q bo'lsa
// `required` ishlaydi). Kengaytmani originalname'dan tekshiramiz.
function hasAllowedExt(file: Express.Multer.File): boolean {
  const name = file.originalname ?? '';
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  return ALLOWED_EXTS.includes(ext);
}

export function validateDocumentTypeStore(
  type: unknown,
  organizations: unknown,
  file: Express.Multer.File | undefined,
): void {
  const errors: ValidationError[] = [];

  if (isBlank(type)) errors.push(requiredError('type'));
  if (isBlank(organizations)) errors.push(requiredError('organizations'));

  if (!file) {
    errors.push(requiredError('file'));
  } else if (!hasAllowedExt(file)) {
    // synthetic `mimes` konstreynt — message'i `:values` (Laravel: implode(', ')).
    errors.push({ property: 'file', constraints: { mimes: 'doc, docx' } });
  }

  if (errors.length) throw new LaravelValidationException(errors);
}
