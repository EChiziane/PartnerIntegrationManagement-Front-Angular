export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'USER';

export interface User {
  id: string;
  name: string;
  password?: string;
  email: string;
  status: 'CREATED' | 'ACTIVE' | 'INACTIVE';
  phone: string;
  login: string;
  role: UserRole;
  createdAt: string;
}
