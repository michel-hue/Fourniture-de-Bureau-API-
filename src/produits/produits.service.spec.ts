import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Categorie } from '../categories/entities/categorie.entity';
import { Stock } from '../stocks/entities/stock.entity';
import {
  createQueryBuilderMock,
  MockQueryBuilder,
} from '../test-utils/query-builder.mock';
import { ProduitsQuery, ProduitsService } from './produits.service';
import { Produit } from './entities/produit.entity';

const PRODUIT_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORIE_ID = '22222222-2222-2222-2222-222222222222';

function creerProduit(overrides: Partial<Produit> = {}): Produit {
  return {
    id: PRODUIT_ID,
    nom: 'Ramette papier A4',
    description: '500 feuilles',
    prix: 5.5,
    ancien_prix: null,
    marque: 'OfficeCo',
    reference: 'REF-1',
    categorie_id: CATEGORIE_ID,
    actif: true,
    note_moyenne: 4.5,
    nombre_avis: 10,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  } as Produit;
}

function creerStock(overrides: Partial<Stock> = {}): Stock {
  return {
    id: '55555555-5555-5555-5555-555555555555',
    produit_id: PRODUIT_ID,
    quantite: 12,
    seuil_alerte: 5,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  } as Stock;
}

describe('ProduitsService', () => {
  let service: ProduitsService;

  let produitRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
    existsBy: jest.Mock;
  };

  let categorieRepository: { findOne: jest.Mock };

  let stockRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    produitRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
      existsBy: jest.fn(),
    };

    categorieRepository = { findOne: jest.fn() };

    stockRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProduitsService,
        { provide: getRepositoryToken(Produit), useValue: produitRepository },
        {
          provide: getRepositoryToken(Categorie),
          useValue: categorieRepository,
        },
        { provide: getRepositoryToken(Stock), useValue: stockRepository },
      ],
    }).compile();

    service = module.get<ProduitsService>(ProduitsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ------------------------------------------------------------------
  // create
  // ------------------------------------------------------------------
  describe('create', () => {
    it('crée un produit et retourne la réponse enveloppée', async () => {
      const dto = {
        nom: 'Ramette papier A4',
        prix: 5.5,
        categorie_id: CATEGORIE_ID,
      };
      const categorie = { id: CATEGORIE_ID, nom: 'Papier' };
      const entity = creerProduit();
      const saved = { ...entity, id: 'nouveau-id' };

      categorieRepository.findOne.mockResolvedValue(categorie);
      produitRepository.create.mockReturnValue(entity);
      produitRepository.save.mockResolvedValue(saved);

      const resultat = await service.create(dto);

      expect(categorieRepository.findOne).toHaveBeenCalledWith({
        where: { id: CATEGORIE_ID },
      });
      expect(produitRepository.create).toHaveBeenCalledWith(dto);
      expect(produitRepository.save).toHaveBeenCalledWith(entity);
      expect(resultat).toEqual({
        success: true,
        message: 'Produit créé avec succès',
        data: saved,
      });
    });

    it('lève une NotFoundException si la catégorie est introuvable', async () => {
      categorieRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ nom: 'X', prix: 1, categorie_id: CATEGORIE_ID }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(produitRepository.create).not.toHaveBeenCalled();
      expect(produitRepository.save).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // findAll
  // ------------------------------------------------------------------
  describe('findAll', () => {
    let qb: MockQueryBuilder;
    let produits: Produit[];

    beforeEach(() => {
      produits = [creerProduit()];
      qb = createQueryBuilderMock(produits, 24);
      produitRepository.createQueryBuilder.mockReturnValue(qb);
    });

    it('applique la pagination par défaut (page 1, limit 12)', async () => {
      await service.findAll({});

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(12);
    });

    it('calcule le skip à partir de page et limit', async () => {
      await service.findAll({ page: 3, limit: 8 });

      expect(qb.skip).toHaveBeenCalledWith(16); // (3 - 1) * 8
      expect(qb.take).toHaveBeenCalledWith(8);
    });

    it('filtre uniquement les produits actifs', async () => {
      await service.findAll({});

      expect(qb.where).toHaveBeenCalledWith('produit.actif = :actif', {
        actif: true,
      });
    });

    it('retourne la structure { success, message, data, meta }', async () => {
      const resultat = await service.findAll({});

      expect(resultat.success).toBe(true);
      expect(resultat.message).toBe('Produits récupérés avec succès');
      expect(resultat.data).toBe(produits);
      expect(resultat.meta).toEqual({
        total: 24,
        page: 1,
        limit: 12,
        totalPages: 2,
      });
    });

    it('calcule totalPages avec un arrondi supérieur', async () => {
      qb.getManyAndCount.mockResolvedValue([produits, 25]);

      const resultat = await service.findAll({ page: 1, limit: 12 });

      expect(resultat.meta.totalPages).toBe(3); // Math.ceil(25 / 12)
    });

    it('retourne totalPages = 0 quand aucun produit', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const resultat = await service.findAll({});

      expect(resultat.data).toEqual([]);
      expect(resultat.meta).toEqual({
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
      });
    });

    it('filtre par categorie_id', async () => {
      await service.findAll({ categorie_id: CATEGORIE_ID });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'produit.categorie_id = :categorie_id',
        { categorie_id: CATEGORIE_ID },
      );
    });

    it('filtre par search en ILIKE paramétré (anti-injection)', async () => {
      await service.findAll({ search: 'ramette' });

      expect(qb.andWhere).toHaveBeenCalledWith('produit.nom ILIKE :search', {
        search: '%ramette%',
      });
    });

    it('ne construit aucun filtre si les paramètres sont absents', async () => {
      await service.findAll({});

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('filtre par prix_min (borne inclusive)', async () => {
      await service.findAll({ prix_min: 0 });

      expect(qb.andWhere).toHaveBeenCalledWith('produit.prix >= :prix_min', {
        prix_min: 0,
      });
    });

    it('filtre par prix_max (borne inclusive)', async () => {
      await service.findAll({ prix_max: 100 });

      expect(qb.andWhere).toHaveBeenCalledWith('produit.prix <= :prix_max', {
        prix_max: 100,
      });
    });

    it('filtre par une plage de prix complète', async () => {
      await service.findAll({ prix_min: 10, prix_max: 50 });

      expect(qb.andWhere).toHaveBeenCalledWith('produit.prix >= :prix_min', {
        prix_min: 10,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('produit.prix <= :prix_max', {
        prix_max: 50,
      });
    });

    it('cumule tous les filtres simultanément', async () => {
      await service.findAll({
        categorie_id: CATEGORIE_ID,
        search: 'stylo',
        prix_min: 1,
        prix_max: 20,
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(4);
    });

    // --- tris -------------------------------------------------------
    const tris: Array<[ProduitsQuery['sort'], string, string]> = [
      ['prix_asc', 'prix', 'ASC'],
      ['prix_desc', 'prix', 'DESC'],
      ['note', 'note_moyenne', 'DESC'],
      ['nouveautes', 'created_at', 'DESC'],
    ];

    it.each(tris)('trie par %s', async (sort, colonne, direction) => {
      await service.findAll({ sort });

      expect(qb.orderBy).toHaveBeenCalledWith(`produit.${colonne}`, direction);
    });

    it('trie par nouveautés par défaut si sort est absent', async () => {
      await service.findAll({});

      expect(qb.orderBy).toHaveBeenCalledWith('produit.created_at', 'DESC');
    });

    it('retombe sur le tri défaut si sort est une valeur inconnue', async () => {
      await service.findAll({ sort: 'pirate' });

      expect(qb.orderBy).toHaveBeenCalledWith('produit.created_at', 'DESC');
    });

    it('joint la catégorie et les images', async () => {
      await service.findAll({});

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'produit.categorie',
        'categorie',
      );
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'produit.images',
        'images',
      );
    });
  });

  // ------------------------------------------------------------------
  // findOne
  // ------------------------------------------------------------------
  describe('findOne', () => {
    it('retourne le produit avec ses relations', async () => {
      const produit = creerProduit();
      produitRepository.findOne.mockResolvedValue(produit);

      const resultat = await service.findOne(PRODUIT_ID);

      expect(produitRepository.findOne).toHaveBeenCalledWith({
        where: { id: PRODUIT_ID },
        relations: { categorie: true, images: true },
      });
      expect(resultat).toEqual({
        success: true,
        message: 'Produit récupéré avec succès',
        data: produit,
      });
    });

    it('lève une NotFoundException si le produit est introuvable', async () => {
      produitRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ------------------------------------------------------------------
  // findStockByProduit
  // ------------------------------------------------------------------
  describe('findStockByProduit', () => {
    it('retourne le stock du produit dans l’enveloppe standard', async () => {
      produitRepository.existsBy.mockResolvedValue(true);
      stockRepository.findOne.mockResolvedValue(
        creerStock({ quantite: 12, seuil_alerte: 5 }),
      );

      const resultat = await service.findStockByProduit(PRODUIT_ID);

      expect(produitRepository.existsBy).toHaveBeenCalledWith({
        id: PRODUIT_ID,
      });
      expect(stockRepository.findOne).toHaveBeenCalledWith({
        where: { produit_id: PRODUIT_ID },
      });
      expect(resultat).toEqual({
        success: true,
        message: 'Stock du produit',
        data: {
          produit_id: PRODUIT_ID,
          quantite: 12,
          seuil_alerte: 5,
          disponible: true,
          en_rupture: false,
        },
      });
    });

    it('signale un stock faible sans le considérer en rupture', async () => {
      produitRepository.existsBy.mockResolvedValue(true);
      stockRepository.findOne.mockResolvedValue(
        creerStock({ quantite: 3, seuil_alerte: 5 }),
      );

      const resultat = await service.findStockByProduit(PRODUIT_ID);

      expect(resultat.data).toEqual({
        produit_id: PRODUIT_ID,
        quantite: 3,
        seuil_alerte: 5,
        disponible: true,
        en_rupture: false,
      });
    });

    it('signale la rupture quand la quantité est épuisée', async () => {
      produitRepository.existsBy.mockResolvedValue(true);
      stockRepository.findOne.mockResolvedValue(
        creerStock({ quantite: 0, seuil_alerte: 5 }),
      );

      const resultat = await service.findStockByProduit(PRODUIT_ID);

      expect(resultat.data.disponible).toBe(false);
      expect(resultat.data.en_rupture).toBe(true);
    });

    it('renvoie une rupture par défaut si aucun stock n’existe pour ce produit', async () => {
      produitRepository.existsBy.mockResolvedValue(true);
      stockRepository.findOne.mockResolvedValue(null);

      const resultat = await service.findStockByProduit(PRODUIT_ID);

      expect(resultat).toEqual({
        success: true,
        message: 'Stock du produit',
        data: {
          produit_id: PRODUIT_ID,
          quantite: 0,
          seuil_alerte: 0,
          disponible: false,
          en_rupture: true,
        },
      });
    });

    it('lève une NotFoundException si le produit est introuvable', async () => {
      produitRepository.existsBy.mockResolvedValue(false);

      await expect(
        service.findStockByProduit('inconnu'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(stockRepository.findOne).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // update
  // ------------------------------------------------------------------
  describe('update', () => {
    it('met à jour le produit sans vérifier la catégorie si inchangée', async () => {
      const produit = creerProduit();
      produitRepository.findOne.mockResolvedValue(produit);
      produitRepository.save.mockImplementation((p: Produit) =>
        Promise.resolve(p),
      );

      const resultat = await service.update(PRODUIT_ID, {
        nom: 'Nouveau nom',
        categorie_id: CATEGORIE_ID,
      });

      expect(categorieRepository.findOne).not.toHaveBeenCalled();
      expect(produitRepository.save).toHaveBeenCalled();
      expect(resultat.data.nom).toBe('Nouveau nom');
    });

    it('valide la nouvelle catégorie si elle a changé', async () => {
      const nouvelleCategorieId = '33333333-3333-3333-3333-333333333333';
      produitRepository.findOne.mockResolvedValue(creerProduit());
      categorieRepository.findOne.mockResolvedValue({
        id: nouvelleCategorieId,
      });
      produitRepository.save.mockImplementation((p: Produit) =>
        Promise.resolve(p),
      );

      await service.update(PRODUIT_ID, { categorie_id: nouvelleCategorieId });

      expect(categorieRepository.findOne).toHaveBeenCalledWith({
        where: { id: nouvelleCategorieId },
      });
      expect(produitRepository.save).toHaveBeenCalled();
    });

    it('lève une NotFoundException si la nouvelle catégorie est invalide', async () => {
      produitRepository.findOne.mockResolvedValue(creerProduit());
      categorieRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(PRODUIT_ID, {
          categorie_id: '44444444-4444-4444-4444-444444444444',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(produitRepository.save).not.toHaveBeenCalled();
    });

    it('lève une NotFoundException si le produit est introuvable', async () => {
      produitRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('inconnu', { nom: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(produitRepository.save).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // remove
  // ------------------------------------------------------------------
  describe('remove', () => {
    it('supprime le produit trouvé', async () => {
      const produit = creerProduit();
      produitRepository.findOne.mockResolvedValue(produit);
      produitRepository.remove.mockResolvedValue(produit);

      const resultat = await service.remove(PRODUIT_ID);

      expect(produitRepository.remove).toHaveBeenCalledWith(produit);
      expect(resultat).toEqual({
        success: true,
        message: 'Produit supprimé avec succès',
      });
    });

    it('lève une NotFoundException si le produit est introuvable', async () => {
      produitRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(produitRepository.remove).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // findFeatured
  // ------------------------------------------------------------------
  describe('findFeatured', () => {
    it('retourne les produits actifs triés par note décroissante', async () => {
      const produits = [creerProduit()];
      produitRepository.find.mockResolvedValue(produits);

      const resultat = await service.findFeatured(8);

      expect(produitRepository.find).toHaveBeenCalledWith({
        where: { actif: true },
        relations: { categorie: true, images: true },
        order: { note_moyenne: 'DESC', created_at: 'DESC' },
        take: 8,
      });
      expect(resultat).toEqual({
        success: true,
        message: 'Produits en vedette récupérés avec succès',
        data: produits,
      });
    });

    it('respecte la limite demandée', async () => {
      produitRepository.find.mockResolvedValue([]);

      await service.findFeatured(3);

      expect(produitRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 }),
      );
    });
  });
});
