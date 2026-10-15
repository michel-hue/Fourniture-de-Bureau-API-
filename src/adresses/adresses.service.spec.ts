import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AdressesService } from './adresses.service';
import { Adress } from './entities/adress.entity';

describe('AdressesService', () => {
  let service: AdressesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdressesService,
        {
          provide: getRepositoryToken(Adress),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdressesService>(AdressesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
