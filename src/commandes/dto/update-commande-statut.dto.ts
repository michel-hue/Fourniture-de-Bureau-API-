import { IsIn } from 'class-validator';

export class UpdateCommandeStatutDto {
  @IsIn([
    'EN_ATTENTE',
    'PAYEE',
    'EN_PREPARATION',
    'EXPEDIEE',
    'LIVREE',
    'ANNULEE',
  ])
  statut: string;
}
