export interface Driver {
  id: string;
  Name: string;
  Phone: string;
  CarDescription: string;
  status: string;
  truckId?: string | null;
  truckPlateNumber?: string | null;
  truckSize?: string | null;
  truckBrand?: string | null;
  truckDescription?: string | null;
  truckAvailabilityStatus?: string | null;
  truckOwnershipType?: string | null;
  createdAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
}
