import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { columnNumericTransformer } from '../../common/transformers/column-numeric.transformer';
import { Produit } from '../../produits/entities/produit.entity';
import { Commande } from './commande.entity';

@Entity('detail_commandes')
export class DetailCommande {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  commande_id: string;

  @ManyToOne(() => Commande, (commande) => commande.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commande_id' })
  commande: Commande;

  @Column()
  produit_id: string;

  @ManyToOne(() => Produit)
  @JoinColumn({ name: 'produit_id' })
  produit: Produit;

  @Column()
  nom_produit: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: columnNumericTransformer,
  })
  prix_unitaire: number;

  @Column({ type: 'int' })
  quantite: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: columnNumericTransformer,
  })
  sous_total: number;

  @CreateDateColumn()
  created_at: Date;
}
