import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateProduitDto {
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0, { message: 'Le prix ne peut pas être négatif' })
  @Max(99999999.99, {
    message: 'Le prix est trop élevé (maximum 99 999 999,99)',
  })
  prix: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: "L'ancien prix ne peut pas être négatif" })
  @Max(99999999.99, {
    message: "L'ancien prix est trop élevé (maximum 99 999 999,99)",
  })
  ancien_prix?: number;

  @IsOptional()
  @IsString()
  marque?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsUUID()
  categorie_id: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
