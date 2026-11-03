import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Adress } from '../adresses/entities/adress.entity';
import { PaniersModule } from '../paniers/paniers.module';
import { PanierDetail } from '../paniers/entities/panier-detail.entity';
import { Panier } from '../paniers/entities/panier.entity';
import { Produit } from '../produits/entities/produit.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { StocksModule } from '../stocks/stocks.module';
import { CommandeNumeroService } from './commande-numero.service';
import { CommandesController } from './commandes.controller';
import { CommandesService } from './commandes.service';
import { Commande } from './entities/commande.entity';
import { DetailCommande } from './entities/detail-commande.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Commande,
      DetailCommande,
      Produit,
      Stock,
      Adress,
      Panier,
      PanierDetail,
    ]),
    PaniersModule,
    StocksModule,
  ],
  controllers: [CommandesController],
  providers: [CommandesService, CommandeNumeroService],
  exports: [CommandesService, CommandeNumeroService],
})
export class CommandesModule {}
