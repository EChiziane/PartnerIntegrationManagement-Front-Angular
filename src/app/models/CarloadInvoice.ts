import { CarloadInvoiceItem } from './CarloadInvoiceItem';

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
  fileName: string;
  filePath: string;
  createdAt: string;
}
