import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAdressDto {
  @IsNotEmpty()
  @IsString()
  libelle: string;

  @IsNotEmpty()
  @IsString()
  adresse: string;

  @IsNotEmpty()
  @IsString()
  ville: string;

  @IsNotEmpty()
  @IsString()
  pays: string;

  @IsOptional()
  @IsString()
  code_postal?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsBoolean()
  is_principale?: boolean;
}
