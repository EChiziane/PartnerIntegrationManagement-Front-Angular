export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'SETTLED' | 'CANCELLED';
export type PaymentScope = 'CARLOAD' | 'INVOICE' | 'BOTH';

export interface CarloadPayment {
  id?: string;
  carLoadId?: string | null;
  carLoadCustomerName?: string | null;
  invoiceId?: string | null;
  invoiceCode?: string | null;
  customerAmount: number;
  driverAmount: number;
  companyCommission: number;
  paymentStatus: PaymentStatus;
  paymentScope: PaymentScope;
  paymentDate?: string | null;
  notes?: string | null;
  createdAt?: string;
  createdBy?: string | null;
  createdByName?: string | null;
}
