import {CarloadInvoiceItem} from './CarloadInvoiceItem';

export type CarloadInvoiceDescription = 'AREIA_GROSSA' | 'PEDRA';
export type CarloadCotacaoDescription = 'AREIA_GROSSA' | 'PEDRA';

export interface CarloadInvoice {
  id: string;
  carloadCustomerId: string;
  carloadCustomerName: string;
  invoiceCode: string;
  items: CarloadInvoiceItem[];
  description: CarloadInvoiceDescription;
  quantity: number;
  unitPrice: number;
  amount: number;
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  fileName: string;
  filePath: string;
  createdAt: string;
}

export interface CarloadCotacao {
  id: string;
  carloadCustomerId: string;
  carloadCustomerName: string;
  cotacaoCode: string;
  items: CarloadInvoiceItem[];
  description: CarloadCotacaoDescription;
  quantity: number;
  unitPrice: number;
  amount: number;
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  fileName: string;
  filePath: string;
  createdAt: string;
}
