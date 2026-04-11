import { IsEmail } from 'class-validator';

export class ChangeAgentDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string;
}
