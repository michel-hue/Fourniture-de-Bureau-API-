import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { columnNumericTransformer } from '../../common/transformers/column-numeric.transformer';
import { Produit } from '../../produits/entities/produit.entity';
import { Panier } from './panier.entity';

@Entity('panier_detail')
export class PanierDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  panier_id: string;

  @ManyToOne(() => Panier, (panier) => panier.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'panier_id' })
  panier: Panier;

  @Column()
  produit_id: string;

  @ManyToOne(() => Produit)
  @JoinColumn({ name: 'produit_id' })
  produit: Produit;

  @Column({ type: 'int', default: 1 })
  quantite: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: columnNumericTransformer,
  })
  prix_unitaire: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
