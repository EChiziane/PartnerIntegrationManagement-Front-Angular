import {CarloadInvoiceItem} from './carload-invoice-item';

export interface CarloadInvoice {
  id: string;
  carloadCustomerId: string;
  carloadCustomerName: string;
  invoiceCode: string;
  items: CarloadInvoiceItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  createdAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
}
