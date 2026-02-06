export interface Manager {
  id: string;
  name: string;
  contact: string;
  address: string;
  status: 'ACTIVO' | 'INACTIVO' | string;
  createdAt: string; // ISO 8601
}
