export interface Driver {
  id: string;
  Name: string;
  Phone: string;
  CarDescription: string;
  status: string;
  createdAt: string; // ISO 8601
  createdBy?: string | null;
  createdByName?: string | null;
}
