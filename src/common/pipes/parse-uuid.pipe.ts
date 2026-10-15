import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

/**
 * ParseUUIDPipe avec un message d'erreur en français.
 *
 * Par défaut `ParseUUIDPipe` renvoie « Validation failed (uuid is expected) »
 * et laisse passer les identifiants qui ne sont pas des UUID au service, qui
 * provoque alors une erreur PostgreSQL (code 22P02) traduite en HTTP 500.
 * Ce pipe rejette les valeurs invalides dès la couche HTTP avec un 400 clair.
 */
export class FrenchParseUUIDPipe extends ParseUUIDPipe {
  constructor() {
    super({
      exceptionFactory: () =>
        new BadRequestException(
          'Identifiant invalide : un UUID est attendu dans l’URL',
        ),
    });
  }
}
