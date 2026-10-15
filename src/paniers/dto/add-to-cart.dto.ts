import { IsInt, IsUUID, Min } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  produit_id: string;

  @IsInt()
  @Min(1)
  quantite: number;
}
