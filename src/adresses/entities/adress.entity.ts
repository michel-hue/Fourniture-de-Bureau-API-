import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('adresses')
export class Adress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  libelle: string;

  @Column()
  adresse: string;

  @Column()
  ville: string;

  @Column()
  pays: string;

  @Column({ nullable: true })
  code_postal: string;

  @Column({ nullable: true })
  telephone: string;

  @Column({ default: false })
  is_principale: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
