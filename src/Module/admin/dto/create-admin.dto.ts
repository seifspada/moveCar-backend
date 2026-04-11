// create-admin.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateAdminDto {
  // ✅ userId supprimé — plus exposé dans le JSON

  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}