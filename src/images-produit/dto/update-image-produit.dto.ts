import { PartialType } from '@nestjs/mapped-types';
import { CreateImageProduitDto } from './create-image-produit.dto';

export class UpdateImageProduitDto extends PartialType(CreateImageProduitDto) {}
