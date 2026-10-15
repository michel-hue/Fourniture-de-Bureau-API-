import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import {
  createQueryBuilderMock,
  MockQueryBuilder,
} from '../test-utils/query-builder.mock';
import { Stock } from './entities/stock.entity';
import { StocksService } from './stocks.service';

const STOCK_ID = '55555555-5555-5555-5555-555555555555';
const PRODUIT_ID = '11111111-1111-1111-1111-111111111111';

function creerStock(overrides: Partial<Stock> = {}): Stock {
  return {
    id: STOCK_ID,
    produit_id: PRODUIT_ID,
    quantite: 20,
    seuil_alerte: 5,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  } as Stock;
}

describe('StocksService', () => {
  let service: StocksService;

  let stockRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    stockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StocksService,
        { provide: getRepositoryToken(Stock), useValue: stockRepository },
      ],
    }).compile();

    service = module.get<StocksService>(StocksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crée un stock si aucun stock n’existe pour le produit', async () => {
      const dto = { produit_id: PRODUIT_ID, quantite: 10, seuil_alerte: 3 };
      const entity = creerStock();
      const saved = { ...entity, id: 'nouveau-id' };

      stockRepository.findOne.mockResolvedValue(null);
      stockRepository.create.mockReturnValue(entity);
      stockRepository.save.mockResolvedValue(saved);

      const resultat = await service.create(dto);

      expect(stockRepository.findOne).toHaveBeenCalledWith({
        where: { produit_id: PRODUIT_ID },
      });
      expect(resultat).toEqual({
        success: true,
        message: 'Stock créé avec succès',
        data: saved,
      });
    });

    it('refuse la création si un stock existe déjà pour ce produit', async () => {
      stockRepository.findOne.mockResolvedValue(creerStock());

      await expect(
        service.create({ produit_id: PRODUIT_ID, quantite: 10 }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(stockRepository.create).not.toHaveBeenCalled();
      expect(stockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('retourne tous les stocks avec leur produit', async () => {
      const stocks = [creerStock()];
      stockRepository.find.mockResolvedValue(stocks);

      const resultat = await service.findAll();

      expect(stockRepository.find).toHaveBeenCalledWith({
        relations: { produit: true },
      });
      expect(resultat).toEqual({
        success: true,
        message: 'Stocks récupérés avec succès',
        data: stocks,
      });
    });
  });

  describe('findOne', () => {
    it('retourne le stock avec son produit', async () => {
      const stock = creerStock();
      stockRepository.findOne.mockResolvedValue(stock);

      const resultat = await service.findOne(STOCK_ID);

      expect(stockRepository.findOne).toHaveBeenCalledWith({
        where: { id: STOCK_ID },
        relations: { produit: true },
      });
      expect(resultat.data).toBe(stock);
    });

    it('lève une NotFoundException si le stock est introuvable', async () => {
      stockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findOneByProduit', () => {
    it('retourne le stock correspondant au produit', async () => {
      const stock = creerStock();
      stockRepository.findOne.mockResolvedValue(stock);

      const resultat = await service.findOneByProduit(PRODUIT_ID);

      expect(stockRepository.findOne).toHaveBeenCalledWith({
        where: { produit_id: PRODUIT_ID },
        relations: { produit: true },
      });
      expect(resultat).toEqual({
        success: true,
        message: 'Stock récupéré avec succès',
        data: stock,
      });
    });

    it('lève une NotFoundException si le produit n’a pas de stock', async () => {
      stockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneByProduit('inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('met à jour le stock trouvé', async () => {
      const stock = creerStock();
      stockRepository.findOne.mockResolvedValue(stock);
      stockRepository.save.mockImplementation((s: Stock) => Promise.resolve(s));

      const resultat = await service.update(STOCK_ID, {
        quantite: 50,
        seuil_alerte: 10,
      });

      expect(resultat.data.quantite).toBe(50);
      expect(resultat.data.seuil_alerte).toBe(10);
      expect(stockRepository.save).toHaveBeenCalledWith(stock);
    });

    it('lève une NotFoundException si le stock est introuvable', async () => {
      stockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('inconnu', { quantite: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(stockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('supprime le stock trouvé', async () => {
      const stock = creerStock();
      stockRepository.findOne.mockResolvedValue(stock);
      stockRepository.remove.mockResolvedValue(stock);

      const resultat = await service.remove(STOCK_ID);

      expect(stockRepository.remove).toHaveBeenCalledWith(stock);
      expect(resultat).toEqual({
        success: true,
        message: 'Stock supprimé avec succès',
      });
    });

    it('lève une NotFoundException si le stock est introuvable', async () => {
      stockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(stockRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getAlerts', () => {
    let qb: MockQueryBuilder;

    beforeEach(() => {
      qb = createQueryBuilderMock([]);
      stockRepository.createQueryBuilder.mockReturnValue(qb);
    });

    it('filtre sur quantite <= seuil_alerte', async () => {
      await service.getAlerts();

      expect(stockRepository.createQueryBuilder).toHaveBeenCalledWith('stock');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'stock.produit',
        'produit',
      );
      expect(qb.where).toHaveBeenCalledWith(
        'stock.quantite <= stock.seuil_alerte',
      );
      expect(qb.getMany).toHaveBeenCalled();
    });

    it('retourne la liste des stocks en alerte', async () => {
      const alertes = [creerStock({ quantite: 2, seuil_alerte: 5 })];
      qb.getMany.mockResolvedValue(alertes);

      const resultat = await service.getAlerts();

      expect(resultat).toEqual({
        success: true,
        message: 'Stocks en alerte récupérés avec succès',
        data: alertes,
      });
    });
  });

  describe('updateQuantite', () => {
    it('met à jour la quantité du stock du produit', async () => {
      const stock = creerStock({ quantite: 20 });
      stockRepository.findOne.mockResolvedValue(stock);
      stockRepository.save.mockImplementation((s: Stock) => Promise.resolve(s));

      const resultat = await service.updateQuantite(PRODUIT_ID, 7);

      expect(stockRepository.findOne).toHaveBeenCalledWith({
        where: { produit_id: PRODUIT_ID },
      });
      expect(resultat.data.quantite).toBe(7);
      expect(stockRepository.save).toHaveBeenCalledWith(stock);
    });

    it('permet de mettre la quantité à zéro (rupture)', async () => {
      const stock = creerStock({ quantite: 3 });
      stockRepository.findOne.mockResolvedValue(stock);
      stockRepository.save.mockImplementation((s: Stock) => Promise.resolve(s));

      const resultat = await service.updateQuantite(PRODUIT_ID, 0);

      expect(resultat.data.quantite).toBe(0);
    });

    it('lève une NotFoundException si le produit n’a pas de stock', async () => {
      stockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateQuantite('inconnu', 5)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(stockRepository.save).not.toHaveBeenCalled();
    });
  });
});
