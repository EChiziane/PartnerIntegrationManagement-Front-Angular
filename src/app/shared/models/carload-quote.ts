import { CarloadQuoteItem } from './carload-quote-item';

export interface CarloadQuote {
  id?: string;
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
  createdAt?: string;
  createdBy?: string | null;
  createdByName?: string | null;
}
