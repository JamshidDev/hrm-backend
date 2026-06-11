// Laravel `same:other_field` rule ekvivalenti — boshqa maydon qiymati bilan tenglik.
//
// Foydalanish:
//   class UpdatePasswordDto {
//     new_password!: string;
//     @Match('new_password')
//     new_password_confirmation!: string;
//   }

import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'Match', async: false })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedProperty] = args.constraints as [string];
    const related = (args.object as Record<string, unknown>)[relatedProperty];
    return value === related;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedProperty] = args.constraints as [string];
    return `${args.property} must match ${relatedProperty}`;
  }
}

export function Match(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}
