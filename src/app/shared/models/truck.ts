export type TruckAvailabilityStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'INACTIVE';
export type TruckOwnershipType = 'INTERNAL' | 'EXTERNAL';

export interface Truck {
  id: string;
  plateNumber?: string | null;
  truckSize: string;
  brand?: string | null;
  description?: string | null;
  availabilityStatus: TruckAvailabilityStatus;
  ownershipType: TruckOwnershipType;
  assignedDriverId?: string | null;
  assignedDriverName?: string | null;
  createdAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
}
