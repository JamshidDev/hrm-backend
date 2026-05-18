// Laravel `exists:table,column` rule ekvivalenti.
//
// Foydalanish:
//   class CreateRegionDto {
//     @IsInt()
//     @Exists('countries', 'id')
//     country_id!: number;
//   }
//
// Soft-deleted record'lar "yo'q" deb hisoblanadi (Laravel default behavior).
// Validator NestJS DI bilan ishlashi uchun main.ts'da:
//   useContainer(app.select(AppModule), { fallbackOnErrors: true });
//
// Konstruktorga DataSource inject qilinadi → DB query ishlatadi.

import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { eq, isNull, and, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import * as schema from '@/db/schema';

@ValidatorConstraint({ name: 'Exists', async: true })
@Injectable()
export class ExistsConstraint implements ValidatorConstraintInterface {
  constructor(@InjectDb() private readonly db: DataSource) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    if (value === null || value === undefined) return true; // optional fieldlar uchun

    const [tableName, columnName] = args.constraints as [string, string];

    // Schema'dan jadvalni topamiz.
    const table = (schema as Record<string, unknown>)[tableName] as
      | Record<string, unknown>
      | undefined;
    if (!table) return false;

    const column = table[columnName] as { name: string } | undefined;
    if (!column) return false;

    // `deleted_at` columni bo'lsa — soft-delete filter (Laravel default).
    const deletedAtCol = (table as { deleted_at?: unknown }).deleted_at;

    // SELECT 1 FROM <table> WHERE <column> = $1 [AND deleted_at IS NULL] LIMIT 1
    const where = deletedAtCol
      ? and(eq(column as never, value as never), isNull(deletedAtCol as never))
      : eq(column as never, value as never);

    const rows = await this.db.execute(
      sql`SELECT 1 FROM ${sql.identifier(tableName)} WHERE ${where} LIMIT 1`,
    );

    // postgres-js Result — `length > 0` agar topilsa.
    return Array.isArray(rows)
      ? rows.length > 0
      : (rows as unknown as { length: number }).length > 0;
  }

  defaultMessage(args: ValidationArguments): string {
    const [tableName] = args.constraints as [string];
    return `${args.property} does not exist in ${tableName}`;
  }
}

export function Exists(
  tableName: string,
  columnName: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [tableName, columnName],
      validator: ExistsConstraint,
    });
  };
}
