import { CarloadQuoteItem } from './carload-quote-item';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

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
  versionNumber?: number | null;
  previousVersionId?: string | null;
  quoteStatus?: QuoteStatus | null;
  approvedAt?: string | null;
  generatedCarloadsCount?: number | null;
  createdBy?: string | null;
  createdByName?: string | null;
}
