import {ProductPrice} from './product-price';

export interface CatalogMaterial {
  id?: string;
  i18nKey: string;
  materialName: string;
  title: string;
  subtitle: string;
  originNote: string;
  imageTone: 'sand' | 'stone' | 'red' | 'dark' | 'blocks';
  imageUrl: string;
  secondaryImageUrl?: string;
  fallbackPrice: number;
  price?: number;
  applications: string[];
  benefits: string[];
  active?: boolean;
  displayOrder?: number;
  updatedAt?: string;
}

export interface CatalogProductionItem {
  id?: string;
  title: string;
  measure: string;
  ratio: string;
  output: string;
  active?: boolean;
  displayOrder?: number;
  updatedAt?: string;
}

export interface CommercialCatalog {
  id: string;
  code?: string;
  i18nKey: string;
  title: string;
  vehicleName: string;
  vehicleModel: string;
  audience: string;
  volume: string;
  volumeM3: number;
  wheelbarrows: number;
  equivalent4mTrucks: number;
  equivalent7mTrucks: number;
  heroImageUrl: string;
  vehicleImageUrl: string;
  productionImageUrl: string;
  wheelbarrowImageUrl: string;
  contactImageUrl: string;
  heroLine: string;
  promise: string;
  active?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  materials: CatalogMaterial[];
  production: CatalogProductionItem[];
}

export interface CatalogMaterialView extends CatalogMaterial {
  productPrice?: ProductPrice;
}

export interface CatalogView extends CommercialCatalog {
  materialViews: CatalogMaterialView[];
}
