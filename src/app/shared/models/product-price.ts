export interface ProductPrice {
  id: string;
  code: string;
  label: string;
  truckVolume: string;
  materialName: string;
  salePrice: number;
  driverCost: number;
  margin: number;
  active: boolean;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  updatedById?: string | null;
  updatedByName?: string | null;
}
