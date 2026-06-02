// Laravel ValidationException parity — 422 + { message, errors }.
// class-validator'ning xom ValidationError[] ni tashiydi; localize'ni filter
// (request Accept-Language bilan) bajaradi.

import type { ValidationError } from 'class-validator';

export class LaravelValidationException extends Error {
  readonly status = 422;
  constructor(public readonly errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'LaravelValidationException';
  }
}
