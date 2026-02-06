import {Payment} from './payment';

export interface Recibo {
  id: string;
  invoiceCode: string;
  payment: Payment;
  customerName: string;
  paymentId: string;
  fileName: string;
  filePath: string;
  total: string;
  monthDescription: string;
  createdAt: string;
}
