import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsValidTimeSlot(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidTimeSlot',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value || typeof value !== 'string') return false;
          
          const regex = /^(\d{2}):(\d{2}) - (\d{2}):(\d{2})$/;
          const match = value.match(regex);
          
          if (!match) return false;
          
          const [, startH, startM, endH, endM] = match.map(Number);
          
          // Vérifier validité des heures et minutes
          if (startH > 23 || endH > 23 || startM > 59 || endM > 59) return false;
          
          // Vérifier que fin > début
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;
          
          return endMinutes > startMinutes;
        },
        defaultMessage() {
          return 'Créneau horaire invalide (format HH:MM - HH:MM, fin doit être après début)';
        }
      }
    });
  };
}
