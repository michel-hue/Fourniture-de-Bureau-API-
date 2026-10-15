import { IsOptional, IsString } from 'class-validator';

export class CreateProfileDto {
  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  date_naissance?: string;

  @IsOptional()
  @IsString()
  sexe?: string;
}
