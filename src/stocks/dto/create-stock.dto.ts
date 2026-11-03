import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateStockDto {
  @IsUUID()
  produit_id: string;

  @IsInt()
  @Min(0)
  quantite: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  seuil_alerte?: number;
}
