export type CarLoadStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
export type CarloadType = 'Produced' | 'Sold';

export interface CarLoad {
  id: string;

  deliveryDestination: string;
  customerName: string;
  customerPhoneNumber: string;

  logisticsManagerName: string | null;
  logisticsManagerId: string | null;

  assignedDriverName: string;
  assignedDriverId: string;

  transportedMaterial: string;

  carloadBatchName: string;
  carloadBatchId: string;

  totalSpent: number;
  totalEarnings: number;

  deliveryDate: string | null;
  deliveryScheduledDate: string | null;

  deliveryStatus: CarLoadStatus;
  carloadType: CarloadType;
  createdAt: string; // ISO 8601
}
