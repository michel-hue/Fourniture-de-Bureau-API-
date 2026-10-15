import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Produit } from '../produits/entities/produit.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { PanierDetail } from './entities/panier-detail.entity';
import { Panier } from './entities/panier.entity';
import { PaniersController } from './paniers.controller';
import { PaniersService } from './paniers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Panier, PanierDetail, Produit, Stock])],
  controllers: [PaniersController],
  providers: [PaniersService],
  exports: [PaniersService],
})
export class PaniersModule {}
