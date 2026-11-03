import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Produit } from '../../produits/entities/produit.entity';

@Entity('images_produit')
export class ImageProduit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  produit_id: string;

  @ManyToOne(() => Produit, (produit) => produit.images)
  @JoinColumn({ name: 'produit_id' })
  produit: Produit;

  @Column()
  url: string;

  @Column({ default: false })
  is_principale: boolean;

  @Column({ default: 0 })
  ordre: number;

  @CreateDateColumn()
  created_at: Date;
}
