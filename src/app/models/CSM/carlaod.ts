export interface CarLoad {
  deliveryDestination: string;
  customerName: string;
  logisticsManagerName: string;
  assignedDriverName: string;
  transportedMaterial: string;
  carloadBatchName: string;
  customerPhoneNumber: string;
  totalSpent: number;
  totalEarnings: number;
  deliveryStatus: string;
  id: string;

  createdAt: string;
  logisticsManagerId: string;
  assignedDriverId: string;
  carloadBatchId: string;

  deliveryScheduledDate: string;

  // ✅ NOVO: data real de entrega (para "Feitas")
  deliveredDate?: string | null;
}
