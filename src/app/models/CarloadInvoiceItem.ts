export type CarloadInvoiceDescription = 'AREIA_GROSSA' | 'PEDRA';

export interface CarloadInvoiceItem {
  description: CarloadInvoiceDescription;
  quantity: number;
  unitPrice: number;
  amount: number; // quantidade * unitPrice
}
