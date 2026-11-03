import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateCommandeDto {
  @IsUUID()
  adresse_livraison_id: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  frais_livraison?: number;
}
