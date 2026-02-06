import {Customer} from './customer';

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  numMonths: number;
  referenceMonth: string;
  paymentMethod: 'EMOLA,MPESA,BCI,NUMERARIO';
  confirmed: boolean;
  customer: Customer;
  paymentDate: string;
}



