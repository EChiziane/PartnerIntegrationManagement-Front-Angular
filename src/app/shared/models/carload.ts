export type CarLoadStatus =
  | 'REQUEST_RECEIVED'
  | 'DRIVER_ASSIGNED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'PAYMENT_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'ON_HOLD';
export type CarloadType = 'Produced' | 'Sold';

export interface CarLoad {
  id: string;

  customerId?: string | null;
  customerName: string;
  customerPhoneNumber: string;

  deliveryDestination: string;

  logisticsManagerName: string | null;
  logisticsManagerId: string | null;

  assignedDriverName: string;
  assignedDriverId: string;
  assignedTruckId?: string | null;
  assignedTruckPlateNumber?: string | null;
  assignedTruckSize?: string | null;
  assignedTruckOwnershipType?: string | null;
  sourceQuoteId?: string | null;
  sourceQuoteCode?: string | null;
  invoiceId?: string | null;
  invoiceCode?: string | null;

  transportedMaterial: string;
  quantity?: number | null;
  truckSize?: string | null;

  carloadBatchName: string;
  carloadBatchId: string;

  totalSpent: number;
  totalEarnings: number;
  customerPrice?: number | null;
  driverAmount?: number | null;
  companyCommission?: number | null;

  deliveryDate: string | null;
  deliveryScheduledDate: string | null;

  deliveryStatus: CarLoadStatus;
  carloadType: CarloadType;
  createdAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
}
