import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';

import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { ProduitsController } from './produits.controller';
import { ProduitsService } from './produits.service';

const PRODUIT_ID = '11111111-1111-1111-1111-111111111111';

describe('ProduitsController', () => {
  let controller: ProduitsController;

  let produitsService: { findStockByProduit: jest.Mock };

  beforeEach(async () => {
    produitsService = {
      findStockByProduit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProduitsController],
      providers: [
        {
          provide: ProduitsService,
          useValue: produitsService,
        },
      ],
    }).compile();

    controller = module.get<ProduitsController>(ProduitsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /:id/stock', () => {
    it('est déclarée sur la route /:id/stock en GET', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const handler = controller.findStock;

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/stock');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
        RequestMethod.GET,
      );
    });

    it('reste publique : aucun guard et aucun rôle admin', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const handler = controller.findStock;

      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toBeUndefined();
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
      expect(
        Reflect.getMetadata(GUARDS_METADATA, ProduitsController),
      ).toBeUndefined();
      expect(
        Reflect.getMetadata(ROLES_KEY, ProduitsController),
      ).toBeUndefined();
    });

    it('délègue la lecture du stock au service', async () => {
      const reponse = {
        success: true,
        message: 'Stock du produit',
        data: {
          produit_id: PRODUIT_ID,
          quantite: 12,
          seuil_alerte: 5,
          disponible: true,
          en_rupture: false,
        },
      };
      produitsService.findStockByProduit.mockResolvedValue(reponse);

      const resultat = await controller.findStock(PRODUIT_ID);

      expect(produitsService.findStockByProduit).toHaveBeenCalledWith(
        PRODUIT_ID,
      );
      expect(resultat).toBe(reponse);
    });
  });
});
