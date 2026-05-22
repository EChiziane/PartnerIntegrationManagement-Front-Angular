export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'CLIENT_PAID' | 'DRIVER_PENDING' | 'SETTLED' | 'CANCELLED';
export type PaymentScope = 'CARLOAD' | 'INVOICE' | 'BOTH';

export interface CarloadPayment {
  id?: string;
  carLoadId?: string | null;
  carLoadCustomerName?: string | null;
  invoiceId?: string | null;
  invoiceCode?: string | null;
  carLoadDescription?: string | null;
  deliveryDestination?: string | null;
  driverName?: string | null;
  carLoadDeliveryStatus?: string | null;
  customerAmount: number;
  driverAmount: number;
  companyCommission: number;
  customerPaidAmount?: number | null;
  driverPaidAmount?: number | null;
  customerBalance?: number | null;
  driverBalance?: number | null;
  paymentStatus: PaymentStatus;
  paymentScope: PaymentScope;
  paymentDate?: string | null;
  notes?: string | null;
  createdAt?: string;
  createdBy?: string | null;
  createdByName?: string | null;
}
