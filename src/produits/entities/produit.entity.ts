import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { columnNumericTransformer } from '../../common/transformers/column-numeric.transformer';
import { Categorie } from '../../categories/entities/categorie.entity';
import { ImageProduit } from '../../images-produit/entities/image-produit.entity';

@Entity('produits')
export class Produit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: columnNumericTransformer,
  })
  prix: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: columnNumericTransformer,
  })
  ancien_prix: number;

  @Column({ nullable: true })
  marque: string;

  @Column({ nullable: true })
  reference: string;

  @Column()
  categorie_id: string;

  @ManyToOne(() => Categorie)
  @JoinColumn({ name: 'categorie_id' })
  categorie: Categorie;

  @Column({ default: true })
  actif: boolean;

  @Column({ default: 0 })
  note_moyenne: number;

  @Column({ default: 0 })
  nombre_avis: number;

  @OneToMany(() => ImageProduit, (image) => image.produit)
  images: ImageProduit[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
