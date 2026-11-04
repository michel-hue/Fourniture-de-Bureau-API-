import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Categorie } from '../categories/entities/categorie.entity';
import { ImageProduit } from '../images-produit/entities/image-produit.entity';
import { Produit } from '../produits/entities/produit.entity';
import { SeedService } from '../seed.service';
import { Stock } from '../stocks/entities/stock.entity';
import { User } from '../auth/entities/user.entity';
import { Profile } from '../profiles/entities/profile.entity';
import * as pg from 'pg';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        driver: pg,
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')) || 5432,
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: true,
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),
    TypeOrmModule.forFeature([
      Categorie,
      Produit,
      ImageProduit,
      Stock,
      User,
      Profile,
    ]),
  ],
  providers: [SeedService],
})
export class DatabaseModule {}
