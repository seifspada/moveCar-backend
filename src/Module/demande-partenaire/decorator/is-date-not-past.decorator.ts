import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsDateNotPast(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isDateNotPast',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const inputDate = new Date(value);
          inputDate.setHours(0, 0, 0, 0);
          return inputDate >= today;
        },
        defaultMessage() {
          return 'La date du rendez-vous ne peut pas être dans le passé';
        }
      }
    });
  };
}
