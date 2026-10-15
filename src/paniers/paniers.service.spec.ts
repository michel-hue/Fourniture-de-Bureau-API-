import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { PanierDetail } from './entities/panier-detail.entity';
import { Panier } from './entities/panier.entity';
import { PaniersService } from './paniers.service';
import { Produit } from '../produits/entities/produit.entity';
import { Stock } from '../stocks/entities/stock.entity';

const USER_ID = 'user-1';
const PANIER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PRODUIT_ID = '11111111-1111-1111-1111-111111111111';
const PRODUIT_ID_2 = '22222222-2222-2222-2222-222222222222';
const DETAIL_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

function creerPanier(overrides: Partial<Panier> = {}): Panier {
  return {
    id: PANIER_ID,
    user_id: USER_ID,
    details: [],
    ...overrides,
  } as Panier;
}

function creerDetail(overrides: Partial<PanierDetail> = {}): PanierDetail {
  return {
    id: DETAIL_ID,
    panier_id: PANIER_ID,
    produit_id: PRODUIT_ID,
    quantite: 2,
    prix_unitaire: 5.5,
    produit: { id: PRODUIT_ID, nom: 'Ramette' } as unknown as Produit,
    ...overrides,
  } as PanierDetail;
}

describe('PaniersService', () => {
  let service: PaniersService;

  let panierRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let panierDetailRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
    delete: jest.Mock;
  };
  let produitRepository: { findOne: jest.Mock };
  let stockRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    panierRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    panierDetailRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
    };
    produitRepository = { findOne: jest.fn() };
    stockRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaniersService,
        { provide: getRepositoryToken(Panier), useValue: panierRepository },
        {
          provide: getRepositoryToken(PanierDetail),
          useValue: panierDetailRepository,
        },
        { provide: getRepositoryToken(Produit), useValue: produitRepository },
        { provide: getRepositoryToken(Stock), useValue: stockRepository },
      ],
    }).compile();

    service = module.get<PaniersService>(PaniersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ------------------------------------------------------------------
  // getOrCreatePanier
  // ------------------------------------------------------------------
  describe('getOrCreatePanier', () => {
    it('retourne le panier existant sans en créer un nouveau', async () => {
      const panier = creerPanier();
      panierRepository.findOne.mockResolvedValue(panier);

      const resultat = await service.getOrCreatePanier(USER_ID);

      expect(panierRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: USER_ID },
      });
      expect(panierRepository.create).not.toHaveBeenCalled();
      expect(panierRepository.save).not.toHaveBeenCalled();
      expect(resultat).toBe(panier);
    });

    it('crée un panier si l’utilisateur n’en a pas', async () => {
      const nouveau = creerPanier();
      panierRepository.findOne.mockResolvedValue(null);
      panierRepository.create.mockReturnValue(nouveau);
      panierRepository.save.mockResolvedValue(nouveau);

      const resultat = await service.getOrCreatePanier(USER_ID);

      expect(panierRepository.create).toHaveBeenCalledWith({
        user_id: USER_ID,
      });
      expect(panierRepository.save).toHaveBeenCalledWith(nouveau);
      expect(resultat).toBe(nouveau);
    });
  });

  // ------------------------------------------------------------------
  // getPanier
  // ------------------------------------------------------------------
  describe('getPanier', () => {
    it('retourne le panier avec le total calculé', async () => {
      const details = [
        creerDetail({ quantite: 2, prix_unitaire: 5.5 }),
        creerDetail({
          id: 'autre',
          produit_id: PRODUIT_ID_2,
          quantite: 3,
          prix_unitaire: 2,
        }),
      ];
      const panier = creerPanier({ details });
      panierRepository.findOne
        .mockResolvedValueOnce(panier) // getOrCreatePanier
        .mockResolvedValueOnce(panier); // panier avec détails

      const resultat = await service.getPanier(USER_ID);

      expect(resultat.success).toBe(true);
      expect(resultat.data.total).toBe(17); // 2*5.5 + 3*2
    });

    it('retourne un total de 0 pour un panier vide', async () => {
      const panier = creerPanier({ details: [] });
      panierRepository.findOne.mockResolvedValue(panier);

      const resultat = await service.getPanier(USER_ID);

      expect(resultat.data.total).toBe(0);
    });

    it('retourne un total de 0 si details est undefined', async () => {
      const panier = creerPanier({ details: undefined });
      panierRepository.findOne.mockResolvedValue(panier);

      const resultat = await service.getPanier(USER_ID);

      expect(resultat.data.total).toBe(0);
    });

    it('lève une NotFoundException si le panier vanished après création', async () => {
      panierRepository.findOne
        .mockResolvedValueOnce(creerPanier())
        .mockResolvedValueOnce(null);

      await expect(service.getPanier(USER_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ------------------------------------------------------------------
  // addItem
  // ------------------------------------------------------------------
  describe('addItem', () => {
    beforeEach(() => {
      produitRepository.findOne.mockResolvedValue({
        id: PRODUIT_ID,
        nom: 'Ramette',
        prix: 5.5,
        actif: true,
      });
      stockRepository.findOne.mockResolvedValue({
        produit_id: PRODUIT_ID,
        quantite: 10,
        seuil_alerte: 5,
      });
      panierRepository.findOne.mockResolvedValue(creerPanier());
    });

    it('ajoute un nouvel article avec le prix unitaire du produit', async () => {
      const detail = creerDetail({ quantite: 2, prix_unitaire: 5.5 });
      panierDetailRepository.findOne.mockResolvedValue(null);
      panierDetailRepository.create.mockReturnValue(detail);
      panierDetailRepository.save.mockResolvedValue(detail);

      await service.addItem(USER_ID, { produit_id: PRODUIT_ID, quantite: 2 });

      expect(panierDetailRepository.create).toHaveBeenCalledWith({
        panier_id: PANIER_ID,
        produit_id: PRODUIT_ID,
        quantite: 2,
        prix_unitaire: 5.5,
      });
      expect(panierDetailRepository.save).toHaveBeenCalledWith(detail);
    });

    it('cumul les quantités si le produit est déjà dans le panier', async () => {
      const existant = creerDetail({ quantite: 2 });
      panierDetailRepository.findOne.mockResolvedValue(existant);
      panierDetailRepository.save.mockResolvedValue(existant);

      await service.addItem(USER_ID, { produit_id: PRODUIT_ID, quantite: 3 });

      expect(panierDetailRepository.create).not.toHaveBeenCalled();
      expect(existant.quantite).toBe(5); // 2 + 3
      expect(panierDetailRepository.save).toHaveBeenCalledWith(existant);
    });

    it('refuse si le cumul dépasse le stock', async () => {
      const existant = creerDetail({ quantite: 8 });
      panierDetailRepository.findOne.mockResolvedValue(existant);
      stockRepository.findOne.mockResolvedValue({
        produit_id: PRODUIT_ID,
        quantite: 10,
        seuil_alerte: 5,
      });

      await expect(
        service.addItem(USER_ID, { produit_id: PRODUIT_ID, quantite: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(panierDetailRepository.save).not.toHaveBeenCalled();
    });

    it('accepte un cumul exactement égal au stock', async () => {
      const existant = creerDetail({ quantite: 7 });
      panierDetailRepository.findOne.mockResolvedValue(existant);
      panierDetailRepository.save.mockResolvedValue(existant);
      stockRepository.findOne.mockResolvedValue({
        produit_id: PRODUIT_ID,
        quantite: 10,
        seuil_alerte: 5,
      });

      await service.addItem(USER_ID, { produit_id: PRODUIT_ID, quantite: 3 });

      expect(existant.quantite).toBe(10);
    });

    it('lève une NotFoundException si le produit est introuvable', async () => {
      produitRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addItem(USER_ID, { produit_id: PRODUIT_ID, quantite: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuse un produit inactif (BadRequest)', async () => {
      produitRepository.findOne.mockResolvedValue({
        id: PRODUIT_ID,
        nom: 'Ramette',
        prix: 5.5,
        actif: false,
      });

      await expect(
        service.addItem(USER_ID, { produit_id: PRODUIT_ID, quantite: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lève une NotFoundException si le stock n’existe pas', async () => {
      stockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addItem(USER_ID, { produit_id: PRODUIT_ID, quantite: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuse si la quantité demandée dépasse le stock', async () => {
      stockRepository.findOne.mockResolvedValue({
        produit_id: PRODUIT_ID,
        quantite: 3,
        seuil_alerte: 5,
      });

      await expect(
        service.addItem(USER_ID, { produit_id: PRODUIT_ID, quantite: 4 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse d’ajouter un produit en rupture (stock = 0)', async () => {
      stockRepository.findOne.mockResolvedValue({
        produit_id: PRODUIT_ID,
        quantite: 0,
        seuil_alerte: 5,
      });

      await expect(
        service.addItem(USER_ID, { produit_id: PRODUIT_ID, quantite: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ------------------------------------------------------------------
  // updateItem
  // ------------------------------------------------------------------
  describe('updateItem', () => {
    beforeEach(() => {
      panierRepository.findOne.mockResolvedValue(creerPanier());
      stockRepository.findOne.mockResolvedValue({
        produit_id: PRODUIT_ID,
        quantite: 10,
        seuil_alerte: 5,
      });
    });

    it('met à jour la quantité de l’article', async () => {
      const detail = creerDetail({ quantite: 2 });
      panierDetailRepository.findOne.mockResolvedValue(detail);
      panierDetailRepository.save.mockResolvedValue(detail);

      await service.updateItem(USER_ID, DETAIL_ID, { quantite: 7 });

      expect(panierDetailRepository.findOne).toHaveBeenCalledWith({
        where: { id: DETAIL_ID, panier_id: PANIER_ID },
      });
      expect(detail.quantite).toBe(7);
      expect(panierDetailRepository.save).toHaveBeenCalledWith(detail);
    });

    it('lève une NotFoundException si l’article n’est pas dans ce panier', async () => {
      panierDetailRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateItem(USER_ID, DETAIL_ID, { quantite: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(panierDetailRepository.save).not.toHaveBeenCalled();
    });

    it('lève une NotFoundException si le stock est introuvable', async () => {
      panierDetailRepository.findOne.mockResolvedValue(creerDetail());
      stockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateItem(USER_ID, DETAIL_ID, { quantite: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuse une quantité supérieure au stock', async () => {
      panierDetailRepository.findOne.mockResolvedValue(creerDetail());
      stockRepository.findOne.mockResolvedValue({
        produit_id: PRODUIT_ID,
        quantite: 5,
        seuil_alerte: 5,
      });

      await expect(
        service.updateItem(USER_ID, DETAIL_ID, { quantite: 6 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(panierDetailRepository.save).not.toHaveBeenCalled();
    });

    it('accepte une quantité exactement égale au stock', async () => {
      const detail = creerDetail({ quantite: 2 });
      panierDetailRepository.findOne.mockResolvedValue(detail);
      panierDetailRepository.save.mockResolvedValue(detail);
      stockRepository.findOne.mockResolvedValue({
        produit_id: PRODUIT_ID,
        quantite: 5,
        seuil_alerte: 5,
      });

      await service.updateItem(USER_ID, DETAIL_ID, { quantite: 5 });

      expect(detail.quantite).toBe(5);
    });
  });

  // ------------------------------------------------------------------
  // removeItem
  // ------------------------------------------------------------------
  describe('removeItem', () => {
    beforeEach(() => {
      panierRepository.findOne.mockResolvedValue(creerPanier());
    });

    it('supprime l’article du panier', async () => {
      const detail = creerDetail();
      panierDetailRepository.findOne.mockResolvedValue(detail);
      panierDetailRepository.remove.mockResolvedValue(detail);

      await service.removeItem(USER_ID, DETAIL_ID);

      expect(panierDetailRepository.findOne).toHaveBeenCalledWith({
        where: { id: DETAIL_ID, panier_id: PANIER_ID },
      });
      expect(panierDetailRepository.remove).toHaveBeenCalledWith(detail);
    });

    it('lève une NotFoundException si l’article n’existe pas', async () => {
      panierDetailRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeItem(USER_ID, DETAIL_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(panierDetailRepository.remove).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // clearPanier
  // ------------------------------------------------------------------
  describe('clearPanier', () => {
    it('supprime tous les détails du panier', async () => {
      const panier = creerPanier({ details: [creerDetail()] });
      panierRepository.findOne.mockResolvedValue(panier);
      panierDetailRepository.delete.mockResolvedValue({ affected: 1 });

      const resultat = await service.clearPanier(USER_ID);

      expect(panierDetailRepository.delete).toHaveBeenCalledWith({
        panier_id: PANIER_ID,
      });
      expect(resultat.success).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // getTotal (logique financière)
  // ------------------------------------------------------------------
  describe('getTotal', () => {
    it('retourne 0 pour un panier sans détail', () => {
      expect(service.getTotal(creerPanier())).toBe(0);
      expect(service.getTotal(creerPanier({ details: [] }))).toBe(0);
    });

    it('somme prix_unitaire x quantite sur chaque ligne', () => {
      const panier = creerPanier({
        details: [
          creerDetail({ quantite: 2, prix_unitaire: 5.5 }),
          creerDetail({ quantite: 4, prix_unitaire: 1.25 }),
        ],
      });

      expect(service.getTotal(panier)).toBe(16); // 11 + 5
    });

    it('arrondit le total à 2 décimales', () => {
      const panier = creerPanier({
        details: [
          creerDetail({ quantite: 1, prix_unitaire: 10.005 }),
          creerDetail({
            id: 'autre',
            produit_id: PRODUIT_ID_2,
            quantite: 1,
            prix_unitaire: 1.004,
          }),
        ],
      });

      // 10.005 + 1.004 = 11.009 -> arrondi à 11.01
      expect(service.getTotal(panier)).toBe(11.01);
    });

    it('reste stable sur un total déjà à 2 décimales', () => {
      const panier = creerPanier({
        details: [creerDetail({ quantite: 3, prix_unitaire: 5.55 })],
      });

      expect(service.getTotal(panier)).toBe(16.65);
    });

    it('additionne correctement les décimales flottantes (0.1 + 0.2)', () => {
      const panier = creerPanier({
        details: [
          creerDetail({ quantite: 1, prix_unitaire: 0.1 }),
          creerDetail({
            id: 'autre',
            produit_id: PRODUIT_ID_2,
            quantite: 1,
            prix_unitaire: 0.2,
          }),
        ],
      });

      // 0.1 + 0.2 = 0.30000000000000004 -> arrondi à 0.3
      expect(service.getTotal(panier)).toBe(0.3);
    });

    it('gère un prix_unitaire stocké en chaîne (decimal TypeORM)', () => {
      const panier = creerPanier({
        details: [
          creerDetail({
            quantite: 2,
            prix_unitaire: '5.50' as unknown as number,
          }),
        ],
      });

      expect(service.getTotal(panier)).toBe(11);
    });

    it('gère un prix nul', () => {
      const panier = creerPanier({
        details: [creerDetail({ quantite: 5, prix_unitaire: 0 })],
      });

      expect(service.getTotal(panier)).toBe(0);
    });
  });
});
