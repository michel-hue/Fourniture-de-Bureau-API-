import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AdressesModule } from './adresses/adresses.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { CommandesModule } from './commandes/commandes.module';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter';
import { DatabaseModule } from './config/database.module';
import { ImagesProduitModule } from './images-produit/images-produit.module';
import { PaniersModule } from './paniers/paniers.module';
import { ProduitsModule } from './produits/produits.module';
import { ProfilesModule } from './profiles/profiles.module';
import { StocksModule } from './stocks/stocks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate limiting global : 100 requêtes / 60s par IP
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    ProfilesModule,
    AuthModule,
    AdressesModule,
    CategoriesModule,
    ProduitsModule,
    ImagesProduitModule,
    StocksModule,
    PaniersModule,
    CommandesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      // Traduit les QueryFailedError de TypeORM (23503, 23505, 22P02) en 409/400
      provide: APP_FILTER,
      useClass: TypeOrmExceptionFilter,
    },
  ],
})
export class AppModule {}
