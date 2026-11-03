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

import { Adress } from '../../adresses/entities/adress.entity';
import { User } from '../../auth/entities/user.entity';
import { columnNumericTransformer } from '../../common/transformers/column-numeric.transformer';
import { DetailCommande } from './detail-commande.entity';

@Entity('commandes')
export class Commande {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  numero: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: columnNumericTransformer,
  })
  montant_total: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: columnNumericTransformer,
  })
  frais_livraison: number;

  @Column({ nullable: true })
  adresse_livraison_id: string;

  @ManyToOne(() => Adress)
  @JoinColumn({ name: 'adresse_livraison_id' })
  adresse_livraison: Adress;

  @Column({ default: 'EN_ATTENTE' })
  statut: string;

  @OneToMany(() => DetailCommande, (detail) => detail.commande, {
    cascade: true,
  })
  details: DetailCommande[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
