// Laravel BusinessException ekvivalenti — kontrollanadigan biznes xatolari.

export class BusinessException extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data: unknown = [],
  ) {
    super(message);
    this.name = 'BusinessException';
  }
}
