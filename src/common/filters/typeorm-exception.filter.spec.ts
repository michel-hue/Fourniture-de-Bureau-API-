import type { ArgumentsHost } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { TypeOrmExceptionFilter } from './typeorm-exception.filter';

interface AdaptateurFaux {
  isHeadersSent: jest.Mock;
  reply: jest.Mock;
  end: jest.Mock;
}

function creerArgumentsHost(): ArgumentsHost {
  return {
    getArgByIndex: (index: number) =>
      index === 1 ? ({ fake: 'response' } as unknown) : undefined,
  } as unknown as ArgumentsHost;
}

function creerQueryFailedError(
  code: string,
  contrainte?: string,
): QueryFailedError {
  return new QueryFailedError(
    'SELECT ...',
    [],
    Object.assign(new Error(`pg: ${code}`), { code, constraint: contrainte }),
  );
}

describe('TypeOrmExceptionFilter', () => {
  let filter: TypeOrmExceptionFilter;
  let adaptateur: AdaptateurFaux;

  beforeEach(() => {
    adaptateur = {
      isHeadersSent: jest.fn().mockReturnValue(false),
      reply: jest.fn(),
      end: jest.fn(),
    };

    filter = new TypeOrmExceptionFilter();
    // BaseExceptionFilter reçoit HttpAdapterHost par injection de propriété.
    Object.defineProperty(filter, 'httpAdapterHost', {
      value: { httpAdapter: adaptateur },
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('traduit une violation de clé étrangère (23503) en 409', () => {
    filter.catch(
      creerQueryFailedError('23503', 'FK_123'),
      creerArgumentsHost(),
    );

    expect(adaptateur.reply).toHaveBeenCalledWith(
      expect.anything(),
      {
        statusCode: 409,
        error: 'Conflict',
        message:
          'Impossible de supprimer : cet élément est référencé par d’autres données',
      },
      409,
    );
  });

  it('traduit une violation d’unicité (23505) en 409', () => {
    filter.catch(creerQueryFailedError('23505'), creerArgumentsHost());

    expect(adaptateur.reply).toHaveBeenCalledWith(
      expect.anything(),
      {
        statusCode: 409,
        error: 'Conflict',
        message: 'Impossible d’enregistrer : cet élément existe déjà',
      },
      409,
    );
  });

  it('traduit un UUID invalide (22P02) en 400', () => {
    filter.catch(creerQueryFailedError('22P02'), creerArgumentsHost());

    expect(adaptateur.reply).toHaveBeenCalledWith(
      expect.anything(),
      {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Identifiant invalide : un UUID est attendu',
      },
      400,
    );
  });

  it('laisse remonter les codes SQL inconnus en 500 sans fuite de détail', () => {
    filter.catch(creerQueryFailedError('42P01'), creerArgumentsHost());

    expect(adaptateur.reply).toHaveBeenCalledWith(
      expect.anything(),
      { statusCode: 500, message: 'Internal server error' },
      500,
    );
  });
});
