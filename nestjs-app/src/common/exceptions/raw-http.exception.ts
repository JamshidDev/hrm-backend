// Laravel response()->json([...]) — flat (Helper::response()'siz) javob qaytaradi.
// Auth.hybrid middleware kabi joylar uchun: { "message": "..." } — error/data wrapper'siz.

export class RawHttpException extends Error {
  constructor(
    public readonly status: number,
    public readonly body: Record<string, unknown>,
  ) {
    super(typeof body.message === 'string' ? body.message : 'Error');
    this.name = 'RawHttpException';
  }
}
