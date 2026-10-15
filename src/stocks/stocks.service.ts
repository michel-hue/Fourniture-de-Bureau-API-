import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { Stock } from './entities/stock.entity';

@Injectable()
export class StocksService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
  ) {}

  async create(createStockDto: CreateStockDto) {
    const existingStock = await this.stockRepository.findOne({
      where: { produit_id: createStockDto.produit_id },
    });

    if (existingStock) {
      throw new ConflictException('Un stock existe déjà pour ce produit');
    }

    const stock = this.stockRepository.create(createStockDto);
    const savedStock = await this.stockRepository.save(stock);

    return {
      success: true,
      message: 'Stock créé avec succès',
      data: savedStock,
    };
  }

  async findAll() {
    const stocks = await this.stockRepository.find({
      relations: { produit: true },
    });

    return {
      success: true,
      message: 'Stocks récupérés avec succès',
      data: stocks,
    };
  }

  async findOne(id: string) {
    const stock = await this.stockRepository.findOne({
      where: { id },
      relations: { produit: true },
    });

    if (!stock) {
      throw new NotFoundException('Stock introuvable');
    }

    return {
      success: true,
      message: 'Stock récupéré avec succès',
      data: stock,
    };
  }

  async findOneByProduit(produitId: string) {
    const stock = await this.stockRepository.findOne({
      where: { produit_id: produitId },
      relations: { produit: true },
    });

    if (!stock) {
      throw new NotFoundException('Stock introuvable pour ce produit');
    }

    return {
      success: true,
      message: 'Stock récupéré avec succès',
      data: stock,
    };
  }

  async update(id: string, updateStockDto: UpdateStockDto) {
    const stock = await this.stockRepository.findOne({
      where: { id },
    });

    if (!stock) {
      throw new NotFoundException('Stock introuvable');
    }

    Object.assign(stock, updateStockDto);
    const updatedStock = await this.stockRepository.save(stock);

    return {
      success: true,
      message: 'Stock mis à jour avec succès',
      data: updatedStock,
    };
  }

  async remove(id: string) {
    const stock = await this.stockRepository.findOne({
      where: { id },
    });

    if (!stock) {
      throw new NotFoundException('Stock introuvable');
    }

    await this.stockRepository.remove(stock);

    return {
      success: true,
      message: 'Stock supprimé avec succès',
    };
  }

  async getAlerts() {
    const stocks = await this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.produit', 'produit')
      .where('stock.quantite <= stock.seuil_alerte')
      .getMany();

    return {
      success: true,
      message: 'Stocks en alerte récupérés avec succès',
      data: stocks,
    };
  }

  async updateQuantite(produitId: string, quantite: number) {
    const stock = await this.stockRepository.findOne({
      where: { produit_id: produitId },
    });

    if (!stock) {
      throw new NotFoundException('Stock introuvable pour ce produit');
    }

    stock.quantite = quantite;
    await this.stockRepository.save(stock);

    return {
      success: true,
      message: 'Quantité mise à jour avec succès',
      data: stock,
    };
  }
}
