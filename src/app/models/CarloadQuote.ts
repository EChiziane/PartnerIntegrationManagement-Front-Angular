import {CarloadQuoteItem} from './CarloadQuoteItem';

export interface CarloadQuote {
  id: string;
  quoteCode: string;
  customerName: string;
  customerPhoneNumber: string;
  destination: string;
  items: CarloadQuoteItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  notes?: string;
  validUntil: string | null;
  createdAt: string;
}
