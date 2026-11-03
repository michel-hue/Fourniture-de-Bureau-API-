import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdressesController } from './adresses.controller';
import { AdressesService } from './adresses.service';
import { Adress } from './entities/adress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Adress])],
  controllers: [AdressesController],
  providers: [AdressesService],
  exports: [AdressesService],
})
export class AdressesModule {}
