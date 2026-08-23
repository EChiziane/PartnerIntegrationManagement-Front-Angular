export type PartnerStatus = 'ACTIVE' | 'INACTIVE';

export type RequestType =
  | 'NEW_INTEGRATION'
  | 'UPDATE_INTEGRATION'
  | 'BLOCK_VPN'
  | 'UNBLOCK_VPN'
  | 'CONNECTIVITY_SUPPORT';

export type WorkflowStatus =
  | 'BLOCKED'
  | 'NEW'
  | 'WAITING_FORM'
  | 'FORM_VALIDATION'
  | 'READY_STATEMENT'
  | 'WAITING_SIGNATURES'
  | 'READY_IMPLEMENTATION'
  | 'IMPLEMENTATION'
  | 'READY_CONNECTIVITY'
  | 'CONNECTIVITY_TEST'
  | 'TROUBLESHOOTING'
  | 'READY_UAT'
  | 'UAT_IN_PROGRESS'
  | 'READY_HANDOVER'
  | 'CLOSED';

export type ImplementationStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'IN_PROGRESS' | 'DONE';
export type VpnStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'UP' | 'DOWN';
export type TestStatus = 'NOT_TESTED' | 'IN_PROGRESS' | 'PASS' | 'FAIL';
export type UatStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PASS' | 'ISSUE' | 'WAITING_PARTNER';
export type TaskPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type PartnerEnvironment = 'UAT' | 'PRD' | 'UAT+PRD';

export interface PartnerPrivateEndpoint {
  environment: PartnerEnvironment;
  ip: string;
  port: string;
}

export interface Partner {
  id: string;
  name: string;
  eMolaAccountOtp?: string;
  representativeName?: string;
  businessOwner: string;
  technicalContact: string;
  phone: string;
  email: string;
  serviceApi: string;
  environment: PartnerEnvironment;
  publicIp: string;
  publicPeerIps?: string[];
  partnerServerIp: string;
  uatPort: string;
  prdPort: string;
  privateEndpoints?: PartnerPrivateEndpoint[];
  authMethod?: string;
  ownCloudFolderUrl?: string;
  formNotes?: string;
  status: PartnerStatus;
  lastActivity: string;
}

export interface RequestFormData {
  companyName: string;
  eMolaAccountOtp?: string;
  representativeName?: string;
  businessOwner: string;
  technicalContact: string;
  phone: string;
  email: string;
  serviceApi: string;
  environment: PartnerEnvironment;
  publicIp: string;
  publicPeerIps?: string[];
  partnerServerIp: string;
  uatPort: string;
  prdPort: string;
  privateEndpoints?: PartnerPrivateEndpoint[];
  authMethod?: string;
  ownCloudFolderUrl?: string;
  formNotes?: string;
  importedFileName?: string;
  importedAt?: string;
}

export interface PartnerRequest {
  id: string;
  partnerId: string;
  title?: string;
  environment?: PartnerEnvironment;
  formData?: RequestFormData;
  type: RequestType;
  openDate: string;
  currentStatus: WorkflowStatus;
  currentOwner: string;
  nextAction: string;
  priority: TaskPriority;
  followUpDate: string;
  stageStartDate: string;
  isBlocked?: boolean;
  previousStatusBeforeBlock?: WorkflowStatus;
  blockReason?: string;
  blockedAt?: string;
  unblockedAt?: string;
  blocker: string;
  formSent: boolean;
  formReceived: boolean;
  formValidated: boolean;
  statementCreated: boolean;
  statementSent: boolean;
  signaturesComplete: boolean;
  ipCoreStatus: ImplementationStatus;
  itStatus: ImplementationStatus;
  vpnStatus: VpnStatus;
  connectivityUat: TestStatus;
  connectivityPrd: TestStatus;
  credentialsProvided: boolean;
  testCredentials?: string;
  uatStatus: UatStatus;
  handoverComplete: boolean;
  closeDate: string | null;
  notes: string;
}

export interface WorkflowTask {
  id: string;
  partnerId: string;
  requestId: string;
  partnerName: string;
  requestType: RequestType;
  title: string;
  owner: string;
  priority: TaskPriority;
  dueDate: string;
  ageDays: number;
  status: WorkflowStatus;
}

export interface TimelineEvent {
  id: string;
  requestId: string;
  date: string;
  title: string;
  description: string;
}

export interface ScanItem {
  id: string;
  category: 'SIGNATURES' | 'IP_CORE' | 'IT' | 'PARTNER';
  question: string;
  partnerName: string;
  requestId: string;
  status: WorkflowStatus;
  suggestedAction: string;
}
