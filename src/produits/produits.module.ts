import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Categorie } from '../categories/entities/categorie.entity';
import { ImageProduit } from '../images-produit/entities/image-produit.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { Produit } from './entities/produit.entity';
import { ProduitsController } from './produits.controller';
import { ProduitsService } from './produits.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Produit, Categorie, ImageProduit, Stock]),
  ],
  controllers: [ProduitsController],
  providers: [ProduitsService],
  exports: [ProduitsService],
})
export class ProduitsModule {}
