export interface CarloadCustomer {
  id: string;
  customerCode: string;
  name: string;
  nuitNumber: string;
  streetAddress: string;
  city: string;
  zipCode: string;
  phoneNumber: string;
  emailAddress: string;
  createdAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
}
