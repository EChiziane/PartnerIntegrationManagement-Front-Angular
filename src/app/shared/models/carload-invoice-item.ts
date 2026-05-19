export interface CarloadInvoiceItem {
  id?: string;
  carloadId?: string | null;
  description: string;
  descriptionLabel?: string | null;
  material?: string | null;
  truckSize?: string | null;
  driverName?: string | null;
  truckPlateNumber?: string | null;
  deliveryDestination?: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
}
