import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

/** Codes d'erreur PostgreSQL (SQLSTATE) traduits en erreurs HTTP explicites. */
const PG_ERROR_CODES = {
  /** violation_foreign_key : l'élément est référencé par d'autres lignes. */
  FK_VIOLATION: '23503',
  /** unique_violation : doublon sur une contrainte d'unicité. */
  UNIQUE_VIOLATION: '23505',
  /** invalid_text_representation : UUID mal formé. */
  INVALID_TEXT_REPRESENTATION: '22P02',
} as const;

interface PgDriverError {
  code?: string;
  constraint?: string;
}

/**
 * Filtre global qui traduit les `QueryFailedError` de TypeORM en erreurs HTTP
 * exploitables, au lieu de laisser remonter une 500 brute de la base de données.
 *
 * - 23503 (clé étrangère)  -> 409 Conflict
 * - 23505 (doublon unique) -> 409 Conflict
 * - 22P02 (UUID invalide)  -> 400 Bad Request
 * - tout autre code        -> laissé à la gestion Nest par défaut (500)
 *
 * Les erreurs déjà typées par Nest (`HttpException`) continuent d'être
 * rendues par le comportement standard, ce qui garantit la cohérence de
 * l'enveloppe d'erreur sur l'ensemble de l'API.
 */
@Catch(QueryFailedError)
export class TypeOrmExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  private readonly logger = new Logger(TypeOrmExceptionFilter.name);

  override catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const driverError = exception.driverError as PgDriverError | undefined;
    const code = driverError?.code ?? (exception as PgDriverError).code;
    const contrainte = driverError?.constraint
      ? ` (contrainte ${driverError.constraint})`
      : '';

    switch (code) {
      case PG_ERROR_CODES.FK_VIOLATION:
        this.logger.warn(
          `Violation de clé étrangère${contrainte} : ${exception.message}`,
        );
        super.catch(
          new ConflictException(
            'Impossible de supprimer : cet élément est référencé par d’autres données',
          ),
          host,
        );
        return;

      case PG_ERROR_CODES.UNIQUE_VIOLATION:
        this.logger.warn(
          `Violation d’unicité${contrainte} : ${exception.message}`,
        );
        super.catch(
          new ConflictException(
            'Impossible d’enregistrer : cet élément existe déjà',
          ),
          host,
        );
        return;

      case PG_ERROR_CODES.INVALID_TEXT_REPRESENTATION:
        this.logger.warn(
          `Format de valeur invalide${contrainte} : ${exception.message}`,
        );
        super.catch(
          new BadRequestException('Identifiant invalide : un UUID est attendu'),
          host,
        );
        return;

      default:
        // Code inconnu : on ne masque rien, on délègue à Nest (500).
        this.logger.error(
          `Erreur de base de données non traduite (code ${code ?? 'inconnu'}) : ${exception.message}`,
        );
        super.catch(exception, host);
    }
  }
}
