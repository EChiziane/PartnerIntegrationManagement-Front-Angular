export interface Manager {
  id: string;
  name: string;
  contact: string;
  address: string;
  status: 'ACTIVO' | 'INACTIVO' | string;
  createdAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
}
