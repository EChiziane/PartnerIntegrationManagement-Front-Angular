export interface Sprint {
  id: string;
  code: string;
  name: string;
  description: string;
  status: 'PLANEADA' | 'EM_EXECUCAO' | 'PAUSADA' | 'ENCERRADO' | 'CANCELADA' | string;
  campaignChannel?: string | null;
  materialFocus?: string | null;
  volumesPromoted?: string | null;
  campaignProducts?: string | null;
  marketingBudget?: number | null;
  targetCarloads?: number | null;
  targetRevenue?: number | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
  closedAt?: string | null;
  createdAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
}
