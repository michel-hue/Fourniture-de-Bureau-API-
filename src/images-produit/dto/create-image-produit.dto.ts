import { IsBoolean, IsInt, IsOptional, IsUrl, Min } from 'class-validator';

export class CreateImageProduitDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsBoolean()
  is_principale?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0, { message: "L'ordre ne peut pas être négatif" })
  ordre?: number;
}
