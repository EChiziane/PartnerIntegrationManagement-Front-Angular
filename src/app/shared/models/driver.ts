export interface Driver {
  id: string;
  Name: string;
  Phone: string;
  CarDescription: string;
  status: string;
  createdAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
}
