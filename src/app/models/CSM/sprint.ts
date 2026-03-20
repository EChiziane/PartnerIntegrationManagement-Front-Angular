export interface Sprint {
  id: string;
  code: string;
  name: string;
  description: string;
  status: 'EM_EXECUCAO' | 'ENCERRADO' | string;
  createdAt: string;
}
