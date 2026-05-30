export const COMPANY_PROFILE = {
  tradeName: 'Transportes Chiziane',
  legalName: 'TRANSPORTE CHIZIANE E FILHOS LDA',
  initials: 'TC',
  nuit: '401903089',
  entityType: 'Sociedade por Quota de Responsabilidade Limitada',
  taxOffice: 'Posto de Cobranca de Marracuene',
  city: 'Maputo',
  country: 'Mocambique',
  addressLine1: 'Maputo, Mocambique',
  addressLine2: 'Posto de Cobranca de Marracuene',
  phonePrimary: '+258 84 509 8583',
  phoneSecondary: '+258 87 998 5279',
  email: 'transporteschiziane@gmail.com',
  activity: 'Fornecimento e transporte de materiais de construcao'
} as const;

export const COMPANY_PDF_LINES = [
  COMPANY_PROFILE.legalName,
  `NUIT: ${COMPANY_PROFILE.nuit}`,
  COMPANY_PROFILE.addressLine1,
  COMPANY_PROFILE.addressLine2,
  `Tel: ${COMPANY_PROFILE.phonePrimary} / ${COMPANY_PROFILE.phoneSecondary}`,
  `Email: ${COMPANY_PROFILE.email}`
] as const;
