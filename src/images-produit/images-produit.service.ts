import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateImageProduitDto } from './dto/create-image-produit.dto';
import { UpdateImageProduitDto } from './dto/update-image-produit.dto';
import { ImageProduit } from './entities/image-produit.entity';
import { Produit } from '../produits/entities/produit.entity';

@Injectable()
export class ImagesProduitService {
  constructor(
    @InjectRepository(ImageProduit)
    private readonly imageProduitRepository: Repository<ImageProduit>,
    @InjectRepository(Produit)
    private readonly produitRepository: Repository<Produit>,
  ) {}

  async create(
    produitId: string,
    createImageProduitDto: CreateImageProduitDto,
  ) {
    const produit = await this.produitRepository.findOne({
      where: { id: produitId },
    });

    if (!produit) {
      throw new NotFoundException('Produit introuvable');
    }

    const image = this.imageProduitRepository.create({
      produit_id: produitId,
      ...createImageProduitDto,
    });

    const savedImage = await this.imageProduitRepository.save(image);

    return {
      success: true,
      message: 'Image ajoutée avec succès',
      data: savedImage,
    };
  }

  async findAll(produitId: string) {
    const produit = await this.produitRepository.findOne({
      where: { id: produitId },
    });

    if (!produit) {
      throw new NotFoundException('Produit introuvable');
    }

    const images = await this.imageProduitRepository.find({
      where: { produit_id: produitId },
      order: { ordre: 'ASC' },
    });

    return {
      success: true,
      message: 'Images récupérées avec succès',
      data: images,
    };
  }

  async update(id: string, updateImageProduitDto: UpdateImageProduitDto) {
    const image = await this.imageProduitRepository.findOne({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException('Image introuvable');
    }

    Object.assign(image, updateImageProduitDto);
    const updatedImage = await this.imageProduitRepository.save(image);

    return {
      success: true,
      message: 'Image mise à jour avec succès',
      data: updatedImage,
    };
  }

  async remove(id: string) {
    const image = await this.imageProduitRepository.findOne({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException('Image introuvable');
    }

    await this.imageProduitRepository.remove(image);

    return {
      success: true,
      message: 'Image supprimée avec succès',
    };
  }
}
