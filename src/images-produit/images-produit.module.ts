import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Produit } from '../produits/entities/produit.entity';
import { ImageProduit } from './entities/image-produit.entity';
import { ImagesProduitController } from './images-produit.controller';
import { ImagesProduitService } from './images-produit.service';

@Module({
  imports: [TypeOrmModule.forFeature([ImageProduit, Produit])],
  controllers: [ImagesProduitController],
  providers: [ImagesProduitService],
  exports: [ImagesProduitService],
})
export class ImagesProduitModule {}
