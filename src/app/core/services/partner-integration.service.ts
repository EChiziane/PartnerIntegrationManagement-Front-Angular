import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {
  Partner,
  PartnerRequest,
  RequestType,
  ScanItem,
  TaskPriority,
  TimelineEvent,
  WorkflowStatus,
  WorkflowTask
} from '@shared/models/partner-integration';

interface PartnerState {
  partners: Partner[];
  requests: PartnerRequest[];
  events: TimelineEvent[];
}

interface PartnerSourceState extends PartnerState {
  version: string;
}

interface PartnerStorageEnvelope {
  sourceVersion: string;
  state: PartnerState;
}

@Injectable({providedIn: 'root'})
export class PartnerIntegrationService {
  private readonly storageKey = 'partner-integration-v1-state';
  private readonly dataSourcePath = 'data/partner-state.txt';
  private sourceState: PartnerSourceState | null = null;

  constructor(private http: HttpClient) {
  }

  async loadFromTextFiles(): Promise<void> {
    try {
      const raw = await firstValueFrom(this.http.get(this.dataSourcePath, {responseType: 'text'}));
      this.sourceState = this.normalizeSourceState(JSON.parse(raw) as PartnerSourceState);
    } catch (error) {
      console.warn('Partner text data could not be loaded. Falling back to bundled seed data.', error);
      this.sourceState = this.normalizeSourceState({
        version: 'fallback-seed',
        ...this.seedState()
      });
    }
  }

  getPartners(): Partner[] {
    return this.state().partners;
  }

  getPartner(id: string): Partner | undefined {
    return this.getPartners().find(partner => partner.id === id);
  }

  getRequests(): PartnerRequest[] {
    return this.state().requests.map(request => this.recalculateRequest(request));
  }

  getRequest(id: string): PartnerRequest | undefined {
    return this.getRequests().find(request => request.id === id);
  }

  getEvents(requestId: string): TimelineEvent[] {
    return this.state().events
      .filter(event => event.requestId === requestId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  createPartner(partner: Omit<Partner, 'id' | 'lastActivity' | 'status'>): Partner {
    const state = this.state();
    const created: Partner = {
      ...partner,
      id: this.id('partner'),
      status: 'ACTIVE',
      lastActivity: this.today()
    };

    state.partners.unshift(created);
    this.save(state);
    return created;
  }

  updatePartner(partnerId: string, patch: Partial<Partner>): Partner {
    const state = this.state();
    const index = state.partners.findIndex(partner => partner.id === partnerId);
    if (index < 0) throw new Error('Partner not found');

    const updated: Partner = {
      ...state.partners[index],
      ...patch,
      id: partnerId,
      lastActivity: this.today()
    };

    state.partners[index] = updated;
    this.save(state);
    return updated;
  }

  createRequest(partnerId: string, type: RequestType): PartnerRequest {
    const state = this.state();
    const request = this.recalculateRequest({
      id: this.id('request'),
      partnerId,
      type,
      openDate: this.today(),
      currentStatus: 'NEW',
      currentOwner: 'Me',
      nextAction: 'Send Introduction + VPN Form + API Spec',
      priority: 'P3',
      followUpDate: this.addDays(1),
      stageStartDate: this.today(),
      blocker: '',
      formSent: false,
      formReceived: false,
      formValidated: false,
      statementCreated: false,
      statementSent: false,
      signaturesComplete: false,
      ipCoreStatus: 'NOT_SUBMITTED',
      itStatus: 'NOT_SUBMITTED',
      vpnStatus: 'NOT_STARTED',
      connectivityUat: 'NOT_TESTED',
      connectivityPrd: 'NOT_TESTED',
      credentialsProvided: false,
      uatStatus: 'NOT_STARTED',
      handoverComplete: false,
      closeDate: null,
      notes: ''
    });

    state.requests.unshift(request);
    state.events.unshift(this.event(request.id, 'Request Opened', this.typeLabel(type)));
    this.touchPartner(state, partnerId);
    this.save(state);
    return request;
  }

  updateRequest(requestId: string, patch: Partial<PartnerRequest>, eventTitle = 'Request Updated'): PartnerRequest {
    const state = this.state();
    const index = state.requests.findIndex(request => request.id === requestId);
    if (index < 0) throw new Error('Request not found');

    const previous = state.requests[index];
    const updated = this.recalculateRequest({...previous, ...patch});
    const statusChanged = previous.currentStatus !== updated.currentStatus;

    state.requests[index] = updated;
    state.events.unshift(this.event(updated.id, eventTitle, statusChanged
      ? `${this.statusLabel(previous.currentStatus)} -> ${this.statusLabel(updated.currentStatus)}`
      : updated.nextAction));
    this.touchPartner(state, updated.partnerId);
    this.save(state);
    return updated;
  }

  resetDemoData(): void {
    localStorage.removeItem(this.storageKey);
  }

  getTasks(): WorkflowTask[] {
    const partners = this.getPartners();
    return this.getRequests()
      .filter(request => request.currentStatus !== 'CLOSED')
      .map(request => {
        const partner = partners.find(item => item.id === request.partnerId)!;
        return {
          id: `task-${request.id}`,
          partnerId: request.partnerId,
          requestId: request.id,
          partnerName: partner?.name || 'Unknown Partner',
          requestType: request.type,
          title: request.nextAction,
          owner: request.currentOwner,
          priority: request.priority,
          dueDate: request.followUpDate,
          ageDays: this.daysBetween(request.stageStartDate, this.today()),
          status: request.currentStatus
        };
      })
      .sort((a, b) => this.priorityWeight(a.priority) - this.priorityWeight(b.priority)
        || b.ageDays - a.ageDays
        || a.dueDate.localeCompare(b.dueDate));
  }

  getScanItems(): ScanItem[] {
    const partners = this.getPartners();
    return this.getRequests()
      .filter(request => request.currentStatus !== 'CLOSED')
      .flatMap(request => {
        const partnerName = partners.find(partner => partner.id === request.partnerId)?.name || 'Unknown Partner';
        const items: ScanItem[] = [];

        if (request.currentStatus === 'WAITING_SIGNATURES') {
          items.push(this.scan('SIGNATURES', 'Statement ja esta totalmente assinado?', partnerName, request));
        }
        if (request.ipCoreStatus !== 'DONE' && ['READY_IMPLEMENTATION', 'IMPLEMENTATION'].includes(request.currentStatus)) {
          items.push(this.scan('IP_CORE', 'IP Core ou VPN ja foi concluido?', partnerName, request));
        }
        if (request.itStatus !== 'DONE' && ['READY_IMPLEMENTATION', 'IMPLEMENTATION'].includes(request.currentStatus)) {
          items.push(this.scan('IT', 'Rotas e politicas de firewall ja foram concluidas?', partnerName, request));
        }
        if (['WAITING_FORM', 'FORM_VALIDATION', 'TROUBLESHOOTING', 'UAT_IN_PROGRESS'].includes(request.currentStatus)) {
          items.push(this.scan('PARTNER', 'Existe resposta, form, correcao ou resultado do parceiro?', partnerName, request));
        }

        return items;
      });
  }

  statusLabel(status: WorkflowStatus): string {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, value => value.toUpperCase());
  }

  typeLabel(type: RequestType): string {
    const labels: Record<RequestType, string> = {
      NEW_INTEGRATION: 'New Integration',
      UPDATE_INTEGRATION: 'Update Integration',
      BLOCK_VPN: 'Block VPN',
      UNBLOCK_VPN: 'Unblock VPN',
      CONNECTIVITY_SUPPORT: 'Connectivity Support'
    };
    return labels[type];
  }

  statusColor(status: WorkflowStatus): string {
    if (status === 'CLOSED' || status === 'READY_UAT' || status === 'READY_CONNECTIVITY' || status === 'READY_HANDOVER') return 'green';
    if (status.startsWith('WAITING')) return 'orange';
    if (status === 'TROUBLESHOOTING') return 'red';
    if (status === 'NEW') return 'default';
    return 'blue';
  }

  private recalculateRequest(request: PartnerRequest): PartnerRequest {
    const currentStatus = this.calculateStatus(request);
    const ownerAction = this.ownerAction(currentStatus);
    const priority = this.calculatePriority({...request, currentStatus});

    return {
      ...request,
      currentStatus,
      currentOwner: ownerAction.owner,
      nextAction: ownerAction.action,
      priority,
      closeDate: currentStatus === 'CLOSED' ? (request.closeDate || this.today()) : null
    };
  }

  private calculateStatus(request: PartnerRequest): WorkflowStatus {
    if (request.type === 'CONNECTIVITY_SUPPORT' && request.connectivityUat === 'FAIL') return 'TROUBLESHOOTING';
    if (request.handoverComplete) return 'CLOSED';
    if (request.uatStatus === 'PASS') return 'READY_HANDOVER';
    if (request.uatStatus === 'IN_PROGRESS' || request.credentialsProvided) return 'UAT_IN_PROGRESS';
    if (request.connectivityUat === 'FAIL' || request.connectivityPrd === 'FAIL' || request.uatStatus === 'ISSUE') return 'TROUBLESHOOTING';
    if (request.connectivityUat === 'PASS' && request.connectivityPrd === 'PASS') return 'READY_UAT';
    if (request.ipCoreStatus === 'DONE' && request.itStatus === 'DONE') return 'READY_CONNECTIVITY';
    if (request.signaturesComplete && (request.ipCoreStatus !== 'DONE' || request.itStatus !== 'DONE')) return 'IMPLEMENTATION';
    if (request.statementSent && !request.signaturesComplete) return 'WAITING_SIGNATURES';
    if (request.statementCreated && !request.statementSent) return 'READY_IMPLEMENTATION';
    if (request.formValidated && !request.statementCreated) return 'READY_STATEMENT';
    if (request.formReceived && !request.formValidated) return 'FORM_VALIDATION';
    if (request.formSent && !request.formReceived) return 'WAITING_FORM';
    return 'NEW';
  }

  private ownerAction(status: WorkflowStatus): { owner: string; action: string } {
    const map: Record<WorkflowStatus, { owner: string; action: string }> = {
      NEW: {owner: 'Me', action: 'Send Introduction + VPN Form + API Spec'},
      WAITING_FORM: {owner: 'Partner', action: 'Follow up partner form'},
      FORM_VALIDATION: {owner: 'Me', action: 'Validate Form'},
      READY_STATEMENT: {owner: 'Me', action: 'Create Statement'},
      WAITING_SIGNATURES: {owner: 'vOffice / Signers', action: 'Follow up signatures'},
      READY_IMPLEMENTATION: {owner: 'Me', action: 'Submit to IP Core + Submit to IT'},
      IMPLEMENTATION: {owner: 'IP Core / IT', action: 'Follow up implementation'},
      READY_CONNECTIVITY: {owner: 'Me', action: 'Coordinate Connectivity Test'},
      CONNECTIVITY_TEST: {owner: 'Me', action: 'Run connectivity tests'},
      TROUBLESHOOTING: {owner: 'Technical Team / Partner', action: 'Troubleshoot / Identify Owner / Next Action'},
      READY_UAT: {owner: 'Me', action: 'Provide API Test Credentials'},
      UAT_IN_PROGRESS: {owner: 'Partner', action: 'Follow up UAT/API testing'},
      READY_HANDOVER: {owner: 'Me', action: 'Handover to Business/Product'},
      CLOSED: {owner: 'Closed', action: 'Archive evidence and keep partner active'}
    };
    return map[status];
  }

  private calculatePriority(request: PartnerRequest): TaskPriority {
    if (request.currentStatus === 'TROUBLESHOOTING') return 'P1';
    if (this.daysBetween(request.followUpDate, this.today()) > 0) return 'P2';
    if (request.currentOwner === 'Me') return 'P3';
    return 'P4';
  }

  private state(): PartnerState {
    const source = this.getSourceState();
    const raw = localStorage.getItem(this.storageKey);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PartnerStorageEnvelope | PartnerState;

        if (this.isStorageEnvelope(parsed) && parsed.sourceVersion === source.version) {
          return parsed.state;
        }
      } catch {
        localStorage.removeItem(this.storageKey);
      }
    }

    const initialState = this.cloneState(source);
    this.save(initialState);
    return initialState;
  }

  private save(state: PartnerState): void {
    const envelope: PartnerStorageEnvelope = {
      sourceVersion: this.getSourceState().version,
      state
    };
    localStorage.setItem(this.storageKey, JSON.stringify(envelope));
  }

  private touchPartner(state: PartnerState, partnerId: string): void {
    const partner = state.partners.find(item => item.id === partnerId);
    if (partner) partner.lastActivity = this.today();
  }

  private scan(category: ScanItem['category'], question: string, partnerName: string, request: PartnerRequest): ScanItem {
    return {
      id: `${category}-${request.id}`,
      category,
      question,
      partnerName,
      requestId: request.id,
      status: request.currentStatus,
      suggestedAction: request.nextAction
    };
  }

  private event(requestId: string, title: string, description: string): TimelineEvent {
    return {id: this.id('event'), requestId, date: new Date().toISOString(), title, description};
  }

  private id(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private addDays(days: number): string {
    const value = new Date();
    value.setDate(value.getDate() + days);
    return value.toISOString().slice(0, 10);
  }

  private daysBetween(start: string, end: string): number {
    if (!start || !end) return 0;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.floor(ms / 86400000));
  }

  private priorityWeight(priority: TaskPriority): number {
    return {P1: 1, P2: 2, P3: 3, P4: 4}[priority];
  }

  private getSourceState(): PartnerSourceState {
    if (!this.sourceState) {
      this.sourceState = this.normalizeSourceState({
        version: 'fallback-seed',
        ...this.seedState()
      });
    }

    return this.sourceState;
  }

  private normalizeSourceState(source: PartnerSourceState): PartnerSourceState {
    return {
      version: source.version || 'unversioned-source',
      partners: source.partners || [],
      requests: (source.requests || []).map(request => this.recalculateRequest(request)),
      events: source.events || []
    };
  }

  private cloneState(source: PartnerSourceState): PartnerState {
    return {
      partners: structuredClone(source.partners),
      requests: structuredClone(source.requests),
      events: structuredClone(source.events)
    };
  }

  private isStorageEnvelope(value: PartnerStorageEnvelope | PartnerState): value is PartnerStorageEnvelope {
    return !!value
      && typeof value === 'object'
      && 'sourceVersion' in value
      && 'state' in value;
  }

  private seedState(): PartnerState {
    const partners: Partner[] = [
      ['partner-a', 'Alpha Pay', 'Business Dept', 'Carlos Alpha', '+258 84 100 2001', 'alpha@example.com', 'Payment API', 'UAT + PRD', '139.84.234.187', '10.177.0.10', '8520', '9921'],
      ['partner-b', 'Beta Lotto', 'Business Dept', 'Ana Beta', '+258 84 100 2002', 'beta@example.com', 'USSD / API', 'UAT + PRD', '72.61.147.82', '10.177.0.20', '8600', '9600'],
      ['partner-c', 'Thunes', 'Business Dept', 'Ousmane', '+258 84 100 2003', 'thunes@example.com', 'Remittance API', 'UAT + PRD', '52.209.193.244', '52.209.248.254', '8443', '9443'],
      ['partner-d', 'OlaLotto', 'Business Dept', 'Shan', '+258 84 100 2004', 'ola@example.com', 'USSD / API', 'UAT + PRD', '13.245.98.196', '172.31.4.206', '10021', '10020'],
      ['partner-e', 'Onde Tem', 'Business Dept', 'Xefino Jose', '+258 84 100 2005', 'onde@example.com', 'USSD / API', 'UAT + PRD', '34.1.210.78', '10.218.0.2', '8055', '9055'],
      ['partner-f', 'Recarga Aki', 'Business Dept', 'Support Desk', '+258 84 100 2006', 'support@recarga.example', 'Connectivity', 'UAT', '102.207.223.37', '10.0.1.12', '8686', '8685'],
      ['partner-g', '888Bet', 'Business Dept', 'Partner Tech', '+258 84 100 2007', 'tech@888.example', 'Gaming API', 'UAT + PRD', '139.84.238.180', '139.84.238.180', '443', '22'],
      ['partner-h', 'VAARGO', 'Business Dept', 'Operations', '+258 84 100 2008', 'ops@vaargo.example', 'Push USSD', 'PRD', '197.248.224.119', '197.248.224.119', '8443', '9443']
    ].map(([id, name, businessOwner, technicalContact, phone, email, serviceApi, environment, publicIp, partnerServerIp, uatPort, prdPort]) => ({
      id,
      name,
      businessOwner,
      technicalContact,
      phone,
      email,
      serviceApi,
      environment: environment as Partner['environment'],
      publicIp,
      partnerServerIp,
      uatPort,
      prdPort,
      status: 'ACTIVE',
      lastActivity: this.today()
    }));

    const base = (id: string, partnerId: string, type: RequestType, patch: Partial<PartnerRequest>): PartnerRequest => this.recalculateRequest({
      id,
      partnerId,
      type,
      openDate: this.addDays(-8),
      currentStatus: 'NEW',
      currentOwner: 'Me',
      nextAction: '',
      priority: 'P3',
      followUpDate: this.addDays(-1),
      stageStartDate: this.addDays(-4),
      blocker: '',
      formSent: false,
      formReceived: false,
      formValidated: false,
      statementCreated: false,
      statementSent: false,
      signaturesComplete: false,
      ipCoreStatus: 'NOT_SUBMITTED',
      itStatus: 'NOT_SUBMITTED',
      vpnStatus: 'NOT_STARTED',
      connectivityUat: 'NOT_TESTED',
      connectivityPrd: 'NOT_TESTED',
      credentialsProvided: false,
      uatStatus: 'NOT_STARTED',
      handoverComplete: false,
      closeDate: null,
      notes: '',
      ...patch
    });

    const requests = [
      base('request-a', 'partner-a', 'NEW_INTEGRATION', {formSent: true}),
      base('request-b', 'partner-b', 'NEW_INTEGRATION', {formSent: true, formReceived: true, formValidated: true}),
      base('request-c', 'partner-c', 'UPDATE_INTEGRATION', {formSent: true, formReceived: true, formValidated: true, statementCreated: true, statementSent: true}),
      base('request-d', 'partner-d', 'NEW_INTEGRATION', {formSent: true, formReceived: true, formValidated: true, statementCreated: true, statementSent: true, signaturesComplete: true, ipCoreStatus: 'DONE', itStatus: 'IN_PROGRESS'}),
      base('request-e', 'partner-e', 'NEW_INTEGRATION', {formSent: true, formReceived: true, formValidated: true, statementCreated: true, statementSent: true, signaturesComplete: true, ipCoreStatus: 'DONE', itStatus: 'DONE', vpnStatus: 'UP'}),
      base('request-f', 'partner-f', 'CONNECTIVITY_SUPPORT', {formSent: true, formReceived: true, formValidated: true, statementCreated: true, statementSent: true, signaturesComplete: true, ipCoreStatus: 'DONE', itStatus: 'DONE', vpnStatus: 'DOWN', connectivityUat: 'FAIL', blocker: 'Partner reports VPN down'}),
      base('request-g', 'partner-g', 'NEW_INTEGRATION', {formSent: true, formReceived: true, formValidated: true, statementCreated: true, statementSent: true, signaturesComplete: true, ipCoreStatus: 'DONE', itStatus: 'DONE', vpnStatus: 'UP', connectivityUat: 'PASS', connectivityPrd: 'PASS', credentialsProvided: true, uatStatus: 'IN_PROGRESS'}),
      base('request-h', 'partner-h', 'NEW_INTEGRATION', {formSent: true, formReceived: true, formValidated: true, statementCreated: true, statementSent: true, signaturesComplete: true, ipCoreStatus: 'DONE', itStatus: 'DONE', vpnStatus: 'UP', connectivityUat: 'PASS', connectivityPrd: 'PASS', credentialsProvided: true, uatStatus: 'PASS', handoverComplete: true, closeDate: this.today()})
    ];

    const events = requests.map(request => this.event(request.id, 'Demo State', this.statusLabel(request.currentStatus)));
    return {partners, requests, events};
  }
}
