import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {
  Partner,
  PartnerConnection,
  ConnectionHealth,
  ConnectionStage,
  CredentialsStatus,
  PartnerEnvironment,
  PartnerRequest,
  RequestFormData,
  RequestType,
  ScanItem,
  TaskPriority,
  TimelineEvent,
  WorkflowStatus,
  WorkflowTask
} from '@shared/models/partner-integration';
import {environment} from '@env/environment';
import {TranslationService} from '@core/services/translation.service';

interface PartnerState {
  partners: Partner[];
  connections?: PartnerConnection[];
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
  private readonly storageKey = environment.partnerStorageKey;
  private readonly dataSourcePath = environment.partnerDataSourcePath;
  private sourceState: PartnerSourceState | null = null;

  constructor(
    private http: HttpClient,
    private translation: TranslationService
  ) {
  }

  async loadFromTextFiles(): Promise<void> {
    try {
      const raw = await firstValueFrom(this.http.get(this.dataSourcePath, {responseType: 'text'}));
      this.sourceState = this.normalizeSourceState(JSON.parse(raw) as PartnerSourceState);
    } catch (error) {
      console.warn('Integration text data could not be loaded. Falling back to bundled seed data.', error);
      this.sourceState = this.normalizeSourceState({
        version: `fallback-seed-${environment.name}`,
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
    const state = this.state();
    return state.requests.map(request => this.recalculateRequest(this.withRequestData(request, state.partners)));
  }

  getRequest(id: string): PartnerRequest | undefined {
    return this.getRequests().find(request => request.id === id);
  }

  getRequestFormData(request: PartnerRequest, partner?: Partner): RequestFormData {
    return this.withRequestFormData(request, partner || this.getPartner(request.partnerId)).formData!;
  }

  getConnections(): PartnerConnection[] {
    const state = this.state();
    const requests = state.requests.map(request => this.recalculateRequest(this.withRequestData(request, state.partners)));
    return this.normalizeConnections({...state, requests}, state.partners);
  }

  getPartnerConnection(partnerId: string): PartnerConnection | undefined {
    return this.getConnections().find(connection => connection.partnerId === partnerId);
  }

  getPartnerConnections(partnerId: string): PartnerConnection[] {
    return this.getConnections().filter(connection => connection.partnerId === partnerId);
  }

  getConnection(id: string): PartnerConnection | undefined {
    return this.getConnections().find(connection => connection.id === id);
  }

  getConnectionRequests(connectionId: string): PartnerRequest[] {
    const partnerId = this.getConnection(connectionId)?.partnerId || '';
    return this.getRequests()
      .filter(request => (request.connectionId || this.defaultConnectionId(request.partnerId || partnerId)) === connectionId)
      .sort((a, b) => this.requestTimestamp(b) - this.requestTimestamp(a));
  }

  getConnectionEvents(connectionId: string): TimelineEvent[] {
    const requestIds = new Set(this.getConnectionRequests(connectionId).map(request => request.id));
    return this.state().events
      .filter(event => requestIds.has(event.requestId))
      .sort((a, b) => b.date.localeCompare(a.date));
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

  createRequest(partnerId: string, type: RequestType, patch: Partial<PartnerRequest> = {}): PartnerRequest {
    const state = this.state();
    const partner = state.partners.find(item => item.id === partnerId);
    const requestId = this.id('request');
    const {id: _id, partnerId: _partnerId, type: _type, ...safePatch} = patch;
    const connectionId = safePatch.connectionId || this.defaultConnectionId(partnerId);
    const baseConnection = this.normalizeConnections(state, state.partners).find(connection => connection.id === connectionId);
    const baseFormData = baseConnection || this.formDataFromPartner(partner);
    const request = this.recalculateRequest({
      id: requestId,
      partnerId,
      connectionId,
      title: this.defaultRequestTitle(type, partner?.name || 'Unknown Partner'),
      environment: partner?.environment || 'UAT+PRD',
      formData: {...baseFormData, ...(safePatch.formData || {})},
      type,
      openDate: this.today(),
      currentStatus: 'NEW',
      currentOwner: 'Me',
      nextAction: 'Send Introduction + VPN Form + API Spec',
      priority: 'P3',
      followUpDate: this.addDays(1),
      stageStartDate: this.today(),
      isBlocked: false,
      previousStatusBeforeBlock: undefined,
      blockReason: '',
      blockedAt: '',
      unblockedAt: '',
      blocker: '',
      formSent: false,
      formReceived: false,
      formValidated: false,
      statementCreated: false,
      connectionCreatedBy: '',
      statementDate: '',
      statementSent: false,
      signaturesComplete: false,
      srCode: '',
      gnocSrCode: '',
      ipCoreStatus: 'NOT_SUBMITTED',
      itStatus: 'NOT_SUBMITTED',
      vpnStatus: 'NOT_STARTED',
      connectivityUat: 'NOT_TESTED',
      connectivityPrd: 'NOT_TESTED',
      credentialsProvided: false,
      whitelistNumbers: '',
      uatStatus: 'NOT_STARTED',
      handoverComplete: false,
      closeDate: null,
      notes: '',
      ...safePatch
    });

    state.requests.unshift(request);
    state.events.unshift(this.event(request.id, 'Request Opened', request.title || this.typeLabel(type)));
    this.syncConnectionFromRequest(state, request);
    this.touchPartner(state, partnerId);
    this.save(state);
    return request;
  }

  blockRequest(requestId: string, reason: string): PartnerRequest {
    const request = this.getRequest(requestId);
    if (!request) throw new Error('Request not found');

    return this.updateRequest(requestId, {
      isBlocked: true,
      previousStatusBeforeBlock: request.currentStatus,
      blockReason: reason.trim(),
      blockedAt: this.today(),
      unblockedAt: '',
      blocker: reason.trim()
    }, 'Request Blocked');
  }

  unblockRequest(requestId: string, note = ''): PartnerRequest {
    return this.updateRequest(requestId, {
      isBlocked: false,
      unblockedAt: this.today(),
      blocker: note.trim()
    }, 'Request Unblocked');
  }

  updateRequest(requestId: string, patch: Partial<PartnerRequest>, eventTitle = 'Request Updated'): PartnerRequest {
    const state = this.state();
    const index = state.requests.findIndex(request => request.id === requestId);
    if (index < 0) throw new Error('Request not found');

    const previous = state.requests[index];
    const updated = this.recalculateRequest(this.withRequestData({...previous, ...patch}, state.partners));
    const statusChanged = previous.currentStatus !== updated.currentStatus;

    state.requests[index] = updated;
    this.syncConnectionFromRequest(state, updated);
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
          title: request.title || request.nextAction,
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
          items.push(this.scan('SIGNATURES', this.translation.instant('scan.questions.SIGNATURES'), partnerName, request));
        }
        if (request.ipCoreStatus !== 'DONE' && ['READY_IMPLEMENTATION', 'IMPLEMENTATION'].includes(request.currentStatus)) {
          items.push(this.scan('IP_CORE', this.translation.instant('scan.questions.IP_CORE'), partnerName, request));
        }
        if (request.itStatus !== 'DONE' && ['READY_IMPLEMENTATION', 'IMPLEMENTATION'].includes(request.currentStatus)) {
          items.push(this.scan('IT', this.translation.instant('scan.questions.IT'), partnerName, request));
        }
        if (request.currentStatus === 'CONNECTIVITY_TEST') {
          items.push(this.scan('IT', this.translation.instant('scan.questions.CONNECTIVITY'), partnerName, request));
        }
        if (['WAITING_FORM', 'FORM_VALIDATION', 'TROUBLESHOOTING', 'UAT_IN_PROGRESS'].includes(request.currentStatus)) {
          items.push(this.scan('PARTNER', this.translation.instant('scan.questions.PARTNER'), partnerName, request));
        }

        return items;
      });
  }

  statusLabel(status: WorkflowStatus): string {
    return this.labelFromKey(`workflow.status.${status}`, status.replace(/_/g, ' '));
  }

  typeLabel(type: RequestType): string {
    return this.labelFromKey(`workflow.type.${type}`, type.replace(/_/g, ' '));
  }

  requestDisplayTitle(request: PartnerRequest, partner?: Partner): string {
    return request.title || this.defaultRequestTitle(request.type, partner?.name || 'Unknown Partner');
  }

  connectionHealthLabel(health: PartnerConnection['health'] | undefined): string {
    return health
      ? this.labelFromKey(`workflow.health.${health}`, health.replace(/_/g, ' '))
      : this.translation.instant('workflow.health.NOT_ESTABLISHED');
  }

  connectionStageLabel(stage: ConnectionStage | undefined): string {
    return stage
      ? this.labelFromKey(`workflow.connectionStage.${stage}`, stage.replace(/_/g, ' '))
      : this.translation.instant('workflow.connectionStage.DRAFT');
  }

  credentialsStatusLabel(status: CredentialsStatus | undefined): string {
    return status
      ? this.labelFromKey(`workflow.credentials.${status}`, status.replace(/_/g, ' '))
      : this.translation.instant('workflow.credentials.NOT_RECORDED');
  }

  vpnStatusLabel(status: string | undefined): string {
    return status
      ? this.labelFromKey(`workflow.vpn.${status}`, status.replace(/_/g, ' '))
      : this.translation.instant('workflow.vpn.NOT_STARTED');
  }

  testStatusLabel(status: string | undefined): string {
    return status
      ? this.labelFromKey(`workflow.test.${status}`, status.replace(/_/g, ' '))
      : this.translation.instant('workflow.test.NOT_TESTED');
  }

  uatStatusLabel(status: string | undefined): string {
    return status
      ? this.labelFromKey(`workflow.uat.${status}`, status.replace(/_/g, ' '))
      : this.translation.instant('workflow.uat.NOT_STARTED');
  }

  implementationStatusLabel(status: string | undefined): string {
    return status
      ? this.labelFromKey(`workflow.implementation.${status}`, status.replace(/_/g, ' '))
      : this.translation.instant('workflow.implementation.NOT_SUBMITTED');
  }

  connectionStageColor(stage: ConnectionStage | undefined): string {
    if (stage === 'LIVE') return 'green';
    if (stage === 'BLOCKED' || stage === 'TROUBLESHOOTING') return 'red';
    if (stage === 'AWAITING_APPROVAL') return 'orange';
    if (stage === 'IMPLEMENTING' || stage === 'CONNECTIVITY_VALIDATION' || stage === 'API_UAT_VALIDATION') return 'blue';
    return 'default';
  }

  ownerLabel(owner: string | undefined): string {
    if (!owner) return '-';
    return this.labelFromKey(`workflow.owner.${owner}`, owner);
  }

  actionLabel(action: string | undefined): string {
    if (!action) return '-';
    return this.labelFromKey(`workflow.action.${action}`, action);
  }

  stageLabel(label: string): string {
    return this.labelFromKey(`workflow.stage.${this.stageKey(label)}`, label);
  }

  stageDescription(label: string, description: string): string {
    return this.labelFromKey(`workflow.stage.${this.stageKey(label)}Description`, description);
  }

  connectionHealthColor(health: PartnerConnection['health'] | undefined): string {
    if (health === 'HEALTHY') return 'green';
    if (health === 'DEGRADED') return 'orange';
    if (health === 'DOWN' || health === 'BLOCKED') return 'red';
    if (health === 'DISABLED') return 'default';
    return 'default';
  }

  statusColor(status: WorkflowStatus): string {
    if (status === 'BLOCKED') return 'volcano';
    if (status === 'CLOSED' || status === 'READY_UAT' || status === 'READY_CONNECTIVITY' || status === 'READY_HANDOVER') return 'green';
    if (status === 'CONNECTIVITY_TEST' || status === 'UAT_IN_PROGRESS') return 'cyan';
    if (status.startsWith('WAITING')) return 'orange';
    if (status === 'TROUBLESHOOTING') return 'red';
    if (status === 'NEW') return 'default';
    return 'blue';
  }

  private recalculateRequest(request: PartnerRequest): PartnerRequest {
    const currentStatus = this.calculateStatus(request);
    const ownerAction = this.ownerAction(currentStatus);
    const nextAction = currentStatus === 'IMPLEMENTATION'
      ? this.implementationAction({...request, currentStatus})
      : ownerAction.action;
    const priority = this.calculatePriority({...request, currentStatus});

    return {
      ...request,
      currentStatus,
      currentOwner: ownerAction.owner,
      nextAction,
      priority,
      closeDate: currentStatus === 'CLOSED' ? (request.closeDate || this.today()) : null
    };
  }

  private calculateStatus(request: PartnerRequest): WorkflowStatus {
    if (request.isBlocked) return 'BLOCKED';
    if (request.type === 'CONNECTIVITY_SUPPORT' && request.connectivityUat === 'FAIL') return 'TROUBLESHOOTING';
    if (request.handoverComplete) return 'CLOSED';
    if (request.uatStatus === 'PASS') return 'READY_HANDOVER';
    if (request.uatStatus === 'IN_PROGRESS' || request.uatStatus === 'WAITING_PARTNER' || request.credentialsProvided) return 'UAT_IN_PROGRESS';
    if (request.connectivityUat === 'FAIL' || request.connectivityPrd === 'FAIL' || request.uatStatus === 'ISSUE') return 'TROUBLESHOOTING';
    if (this.requiredConnectivityPassed(request)) return 'READY_UAT';
    if (this.connectivityStarted(request)) return 'CONNECTIVITY_TEST';
    if (request.ipCoreStatus === 'DONE' && request.itStatus === 'DONE') return 'READY_CONNECTIVITY';
    if (request.signaturesComplete && request.ipCoreStatus === 'NOT_SUBMITTED' && request.itStatus === 'NOT_SUBMITTED') return 'READY_IMPLEMENTATION';
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
      BLOCKED: {owner: 'Blocked', action: 'Resolve blocker or unblock request'},
      NEW: {owner: 'Me', action: 'Send Introduction + VPN Form + API Spec'},
      WAITING_FORM: {owner: 'Partner', action: 'Follow up VPN integration form'},
      FORM_VALIDATION: {owner: 'Me', action: 'Validate Form'},
      READY_STATEMENT: {owner: 'Me', action: 'Create Statement'},
      WAITING_SIGNATURES: {owner: 'vOffice / Signers', action: 'Follow up signatures'},
      READY_IMPLEMENTATION: {owner: 'Me', action: 'Submit to IP Core + Submit to IT'},
      IMPLEMENTATION: {owner: 'IP Core / IT', action: 'Follow up implementation'},
      READY_CONNECTIVITY: {owner: 'Me', action: 'Coordinate Connectivity Test'},
      CONNECTIVITY_TEST: {owner: 'Me', action: 'Run connectivity tests'},
      TROUBLESHOOTING: {owner: 'Technical Team / Partner', action: 'Troubleshoot integration / identify owner / next action'},
      READY_UAT: {owner: 'Me', action: 'Provide API Test Credentials'},
      UAT_IN_PROGRESS: {owner: 'Partner', action: 'Follow up partner UAT/API testing'},
      READY_HANDOVER: {owner: 'Me', action: 'Handover to Business/Product'},
      CLOSED: {owner: 'Closed', action: 'Archive evidence and keep integration active'}
    };
    return map[status];
  }

  private defaultRequestTitle(type: RequestType, partnerName: string): string {
    const name = partnerName.trim() || 'Unknown Partner';
    const titles: Record<RequestType, string> = {
      NEW_INTEGRATION: `Create connection between eMola and ${name}`,
      UPDATE_INTEGRATION: `Update connection between eMola and ${name}`,
      BLOCK_VPN: `Block connection between eMola and ${name}`,
      UNBLOCK_VPN: `Unblock connection between eMola and ${name}`,
      CONNECTIVITY_SUPPORT: `Troubleshoot connection between eMola and ${name}`
    };
    return titles[type];
  }

  private implementationAction(request: PartnerRequest): string {
    const missing = [
      request.ipCoreStatus !== 'DONE' ? 'IP Core' : '',
      request.itStatus !== 'DONE' ? 'IT' : ''
    ].filter(Boolean);

    return missing.length
      ? `Follow up implementation: ${missing.join(' + ')}`
      : 'Implementation complete';
  }

  private labelFromKey(key: string, fallback: string): string {
    const value = this.translation.instant(key);
    return value === key
      ? fallback.toLowerCase().replace(/\b\w/g, item => item.toUpperCase())
      : value;
  }

  private stageKey(label: string): string {
    return label.replace(/\s+/g, '').replace(/^./, item => item.toLowerCase());
  }

  private calculatePriority(request: PartnerRequest): TaskPriority {
    if (request.currentStatus === 'TROUBLESHOOTING') return 'P1';
    if (this.daysBetween(request.followUpDate, this.today()) > 0) return 'P2';
    if (request.currentOwner === 'Me') return 'P3';
    return 'P4';
  }

  private requiredConnectivityPassed(request: PartnerRequest): boolean {
    if (request.vpnStatus !== 'UP') return false;
    if (this.requiresUat(request.environment) && request.connectivityUat !== 'PASS') return false;
    if (this.requiresPrd(request.environment) && request.connectivityPrd !== 'PASS') return false;
    return true;
  }

  private connectivityStarted(request: PartnerRequest): boolean {
    return request.vpnStatus === 'IN_PROGRESS'
      || request.vpnStatus === 'UP'
      || request.connectivityUat === 'IN_PROGRESS'
      || request.connectivityPrd === 'IN_PROGRESS'
      || request.connectivityUat === 'PASS'
      || request.connectivityPrd === 'PASS';
  }

  private requiresUat(environment: PartnerEnvironment | undefined): boolean {
    return environment !== 'PRD';
  }

  private requiresPrd(environment: PartnerEnvironment | undefined): boolean {
    return environment !== 'UAT';
  }

  private state(): PartnerState {
    const source = this.getSourceState();
    const raw = localStorage.getItem(this.storageKey);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PartnerStorageEnvelope | PartnerState;

        if (this.isStorageEnvelope(parsed) && parsed.sourceVersion === source.version) {
          return this.normalizeState(parsed.state);
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

  private defaultConnectionId(partnerId: string): string {
    return `connection-${partnerId}`;
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
        version: `fallback-seed-${environment.name}`,
        ...this.seedState()
      });
    }

    return this.sourceState;
  }

  private normalizeSourceState(source: PartnerSourceState): PartnerSourceState {
    const partners = source.partners || [];
    const requests = this.normalizeRequests(source.requests || [], partners);
    return {
      version: source.version || 'unversioned-source',
      partners,
      requests,
      connections: this.normalizeConnections({...source, requests}, partners),
      events: source.events || []
    };
  }

  private normalizeState(state: PartnerState): PartnerState {
    const partners = state.partners || [];
    const requests = this.normalizeRequests(state.requests || [], partners);
    return {
      partners,
      requests,
      connections: this.normalizeConnections({...state, requests}, partners),
      events: state.events || []
    };
  }

  private normalizeRequests(requests: PartnerRequest[], partners: Partner[]): PartnerRequest[] {
    return this.removeDuplicateCreationRequests(
      requests.map(request => this.recalculateRequest(this.withRequestData({
        ...request,
        connectionId: request.connectionId || this.defaultConnectionId(request.partnerId)
      }, partners)))
    );
  }

  private removeDuplicateCreationRequests(requests: PartnerRequest[]): PartnerRequest[] {
    const duplicateIds = new Set<string>();
    const groups = new Map<string, PartnerRequest[]>();

    for (const request of requests) {
      if (request.type !== 'NEW_INTEGRATION') continue;
      const key = [
        request.partnerId,
        request.type,
        request.openDate,
        request.formData?.companyName || '',
        request.formData?.publicIp || '',
        request.formData?.partnerServerIp || ''
      ].join('|');
      groups.set(key, [...(groups.get(key) || []), request]);
    }

    groups.forEach(group => {
      const open = this.latestRequest(group.filter(request => request.currentStatus !== 'CLOSED'));
      if (!open) return;
      group
        .filter(request => request.id !== open.id && request.currentStatus === 'CLOSED')
        .forEach(request => duplicateIds.add(request.id));
    });

    return requests.filter(request => !duplicateIds.has(request.id));
  }

  private normalizeConnections(state: PartnerState, partners: Partner[]): PartnerConnection[] {
    const existing = state.connections || [];
    return partners.map(partner => {
      const connectionId = this.defaultConnectionId(partner.id);
      const requests = (state.requests || []).filter(request => (request.connectionId || connectionId) === connectionId);
      const request = this.integrationDrivingRequest(partner.id, state.requests || [], connectionId);
      const current = this.effectiveConnectionBeforeRequest(
        partner,
        state.requests || [],
        request,
        this.cleanStoredConnection(existing.find(connection => connection.id === connectionId || connection.partnerId === partner.id))
      );
      return this.connectionFromPartnerAndRequest(partner, request, current, requests);
    });
  }

  private syncConnectionFromRequest(state: PartnerState, request: PartnerRequest): void {
    const partner = state.partners.find(item => item.id === request.partnerId);
    if (!partner) return;
    const connections = state.connections || this.normalizeConnections(state, state.partners);
    const connectionId = request.connectionId || this.defaultConnectionId(request.partnerId);
    const index = connections.findIndex(connection => connection.id === connectionId || connection.partnerId === request.partnerId);
    const current = this.effectiveConnectionBeforeRequest(partner, state.requests || [], request);
    const requests = (state.requests || []).filter(item => (item.connectionId || this.defaultConnectionId(item.partnerId)) === connectionId);
    const nextConnection = this.connectionFromPartnerAndRequest(partner, request, current, requests);
    if (index >= 0) {
      connections[index] = nextConnection;
    } else {
      connections.unshift(nextConnection);
    }
    state.connections = connections;
  }

  private connectionFromPartnerAndRequest(
    partner: Partner,
    request?: PartnerRequest,
    current?: PartnerConnection,
    requests: PartnerRequest[] = []
  ): PartnerConnection {
    const requestFormData = request ? this.getRequestFormData(request, partner) : this.formDataFromPartner(partner);
    const currentFormData: RequestFormData = current || this.formDataFromPartner(partner);
    const formData = this.shouldApplyRequestFormToConnection(request, current)
      ? requestFormData
      : currentFormData;
    const operationalSource = this.shouldUseRequestOperationalState(request, current)
      ? request
      : current;

    return {
      id: request?.connectionId || current?.id || this.defaultConnectionId(partner.id),
      partnerId: partner.id,
      name: current?.name || `eMola - ${partner.name}`,
      ...formData,
      health: this.connectionHealth(request, current),
      stage: this.connectionStage(request, current),
      vpnStatus: operationalSource?.vpnStatus || 'NOT_STARTED',
      connectivityUat: operationalSource?.connectivityUat || 'NOT_TESTED',
      connectivityPrd: operationalSource?.connectivityPrd || 'NOT_TESTED',
      uatStatus: operationalSource?.uatStatus || 'NOT_STARTED',
      credentialsStatus: this.connectionCredentialsStatus(requests),
      activeRequestId: requests.find(item => item.currentStatus !== 'CLOSED')?.id || '',
      requestCount: requests.length,
      lastRequestId: request?.id || '',
      lastRequestStatus: request?.currentStatus,
      lastRequestType: request?.type,
      lastUpdated: request?.closeDate || request?.stageStartDate || partner.lastActivity || this.today()
    };
  }

  private shouldApplyRequestFormToConnection(request: PartnerRequest | undefined, current?: PartnerConnection): boolean {
    if (!request || !this.hasTechnicalData(request.formData)) return false;
    if (!current || !this.hasTechnicalData(current)) return true;
    if (request.type === 'NEW_INTEGRATION') return true;
    if (request.type === 'UPDATE_INTEGRATION') {
      return request.currentStatus === 'CLOSED'
        || (request.ipCoreStatus === 'DONE' && request.itStatus === 'DONE');
    }
    return false;
  }

  private shouldUseRequestOperationalState(request: PartnerRequest | undefined, current?: PartnerConnection): boolean {
    if (!request) return false;
    if (!current || !this.hasTechnicalData(current)) return true;
    if (request.type === 'NEW_INTEGRATION') return true;
    if (request.type === 'CONNECTIVITY_SUPPORT') return true;
    if (request.type === 'BLOCK_VPN' || request.type === 'UNBLOCK_VPN') return request.currentStatus === 'CLOSED' || this.connectivityStarted(request);
    if (request.type === 'UPDATE_INTEGRATION') {
      return this.connectivityStarted(request)
        || request.vpnStatus === 'DOWN'
        || request.connectivityUat === 'FAIL'
        || request.connectivityPrd === 'FAIL'
        || request.uatStatus === 'ISSUE'
        || request.uatStatus === 'PASS'
        || request.currentStatus === 'CLOSED';
    }
    return false;
  }

  private connectionHealth(request?: PartnerRequest, current?: PartnerConnection): ConnectionHealth {
    if (!request) return this.connectionSnapshotHealth(current);
    if (this.shouldKeepCurrentConnectionHealth(request, current)) {
      return this.connectionSnapshotHealth(current);
    }
    if (request.type === 'BLOCK_VPN' && request.currentStatus === 'CLOSED') return 'DISABLED';
    if (request.currentStatus === 'BLOCKED') return current ? this.connectionSnapshotHealth(current) : 'BLOCKED';
    if (request.vpnStatus === 'DOWN' || request.connectivityUat === 'FAIL' || request.connectivityPrd === 'FAIL') return 'DOWN';
    if (request.currentStatus === 'TROUBLESHOOTING' || request.uatStatus === 'ISSUE') return 'DEGRADED';
    if (request.vpnStatus === 'UP' && this.requiredConnectivityPassed(request) && request.uatStatus === 'PASS') return 'HEALTHY';
    if (!this.hasTechnicalData(request.formData) && request.vpnStatus !== 'UP') return 'NOT_ESTABLISHED';
    return this.connectionSnapshotHealth(current);
  }

  private connectionStage(request?: PartnerRequest, current?: PartnerConnection): ConnectionStage {
    if (!request) return current?.stage || 'DRAFT';
    if (request.currentStatus === 'BLOCKED') return 'BLOCKED';
    if (request.type === 'CONNECTIVITY_SUPPORT' || request.currentStatus === 'TROUBLESHOOTING') return 'TROUBLESHOOTING';
    if (request.currentStatus === 'CLOSED' && this.connectionHealth(request, current) === 'HEALTHY') return 'LIVE';
    if (['NEW', 'WAITING_FORM', 'FORM_VALIDATION', 'READY_STATEMENT', 'READY_IMPLEMENTATION', 'WAITING_SIGNATURES'].includes(request.currentStatus)) {
      return this.hasTechnicalData(request.formData) ? 'AWAITING_APPROVAL' : 'DRAFT';
    }
    if (request.currentStatus === 'IMPLEMENTATION' || request.currentStatus === 'READY_CONNECTIVITY') return 'IMPLEMENTING';
    if (request.currentStatus === 'CONNECTIVITY_TEST' || request.currentStatus === 'READY_UAT') return 'CONNECTIVITY_VALIDATION';
    if (request.currentStatus === 'UAT_IN_PROGRESS' || request.currentStatus === 'READY_HANDOVER') return 'API_UAT_VALIDATION';
    return current?.stage || 'DRAFT';
  }

  private shouldKeepCurrentConnectionHealth(request: PartnerRequest, current?: PartnerConnection): boolean {
    if (!current || !this.hasTechnicalData(current)) return false;
    if (request.type !== 'UPDATE_INTEGRATION') return false;
    if (request.currentStatus === 'CLOSED') return false;
    if (request.vpnStatus === 'DOWN'
      || request.connectivityUat === 'FAIL'
      || request.connectivityPrd === 'FAIL'
      || request.uatStatus === 'ISSUE') return false;
    if (this.connectivityStarted(request) || request.uatStatus === 'PASS') return false;
    return true;
  }

  private connectionSnapshotHealth(current?: PartnerConnection): ConnectionHealth {
    if (!current || !this.hasTechnicalData(current)) return 'NOT_ESTABLISHED';
    if (current.health === 'DISABLED' || current.health === 'BLOCKED') return current.health;
    if (current.vpnStatus === 'DOWN' || current.connectivityUat === 'FAIL' || current.connectivityPrd === 'FAIL') return 'DOWN';
    if (current.uatStatus === 'ISSUE') return 'DEGRADED';
    if (current.vpnStatus === 'UP'
      && (!this.requiresUat(current.environment) || current.connectivityUat === 'PASS')
      && (!this.requiresPrd(current.environment) || current.connectivityPrd === 'PASS')
      && current.uatStatus === 'PASS') {
      return 'HEALTHY';
    }
    if (current.health && ['HEALTHY', 'DEGRADED', 'DOWN', 'BLOCKED', 'DISABLED', 'NOT_ESTABLISHED'].includes(current.health)) return current.health;
    return 'NOT_ESTABLISHED';
  }

  private connectionCredentialsStatus(requests: PartnerRequest[]): CredentialsStatus {
    const relevant = requests.filter(request =>
      request.currentStatus === 'READY_UAT'
      || request.currentStatus === 'UAT_IN_PROGRESS'
      || request.currentStatus === 'READY_HANDOVER'
      || request.currentStatus === 'CLOSED'
      || request.credentialsProvided
      || !!request.testCredentials?.trim()
    );
    if (!relevant.length) return 'NOT_REQUIRED';
    if (relevant.some(request => !!request.testCredentials?.trim())) return 'RECORDED';
    if (relevant.some(request => request.credentialsProvided || request.currentStatus === 'CLOSED' || request.uatStatus === 'PASS')) return 'UNKNOWN_LEGACY';
    return 'NOT_RECORDED';
  }

  private cleanStoredConnection(current?: PartnerConnection): PartnerConnection | undefined {
    if (!current) return undefined;
    return {
      ...current,
      health: this.connectionSnapshotHealth(current)
    };
  }

  private effectiveConnectionBeforeRequest(
    partner: Partner,
    requests: PartnerRequest[],
    drivingRequest?: PartnerRequest,
    fallback?: PartnerConnection
  ): PartnerConnection | undefined {
    const effectiveRequest = this.latestRequest(
      requests
        .filter(request => request.partnerId === partner.id && request.id !== drivingRequest?.id)
        .filter(request => (request.connectionId || this.defaultConnectionId(request.partnerId)) === (drivingRequest?.connectionId || this.defaultConnectionId(partner.id)))
        .map(request => this.recalculateRequest(this.withRequestFormData(request, partner)))
        .filter(request => this.requestHasEffectiveConnectionState(request))
    );

    if (effectiveRequest) {
      return this.connectionFromPartnerAndRequest(partner, effectiveRequest, this.cleanStoredConnection(fallback));
    }

    return this.cleanStoredConnection(fallback);
  }

  private requestHasEffectiveConnectionState(request: PartnerRequest): boolean {
    if (request.type === 'BLOCK_VPN' && request.currentStatus === 'CLOSED') return true;
    if (request.vpnStatus === 'DOWN' || request.connectivityUat === 'FAIL' || request.connectivityPrd === 'FAIL') return true;
    if (request.currentStatus === 'TROUBLESHOOTING' || request.uatStatus === 'ISSUE') return true;
    if (request.currentStatus === 'CLOSED'
      && request.vpnStatus === 'UP'
      && this.requiredConnectivityPassed(request)
      && request.uatStatus === 'PASS'
      && this.hasTechnicalData(request.formData)) return true;
    return false;
  }

  private integrationDrivingRequest(partnerId: string, requests: PartnerRequest[], connectionId = this.defaultConnectionId(partnerId)): PartnerRequest | undefined {
    const partnerRequests = requests
      .filter(request => request.partnerId === partnerId)
      .filter(request => (request.connectionId || this.defaultConnectionId(request.partnerId)) === connectionId)
      .map(request => this.recalculateRequest(request));
    const openRequests = partnerRequests.filter(request => request.currentStatus !== 'CLOSED');
    return this.latestRequest(openRequests) || this.latestRequest(partnerRequests);
  }

  private latestRequest(requests: PartnerRequest[]): PartnerRequest | undefined {
    return [...requests].sort((a, b) => this.requestTimestamp(b) - this.requestTimestamp(a))[0];
  }

  private requestTimestamp(request: PartnerRequest): number {
    return new Date(request.closeDate || request.stageStartDate || request.openDate || 0).getTime() || 0;
  }

  private hasTechnicalData(formData?: RequestFormData): boolean {
    return !!formData
      && (!!formData.publicIp
        || !!formData.partnerServerIp
        || !!formData.publicPeerIps?.length
        || !!formData.privateEndpoints?.length);
  }

  private withRequestData(request: PartnerRequest, partners: Partner[]): PartnerRequest {
    const partner = partners.find(item => item.id === request.partnerId);
    return this.withRequestFormData(this.withRequestEnvironment(request, partners), partner);
  }

  private withRequestEnvironment(request: PartnerRequest, partners: Partner[]): PartnerRequest {
    return {
      ...request,
      environment: request.environment || partners.find(partner => partner.id === request.partnerId)?.environment || 'UAT+PRD'
    };
  }

  private withRequestFormData(request: PartnerRequest, partner?: Partner): PartnerRequest {
    const fallback = this.formDataFromPartner(partner);
    const formData = request.formData || fallback;

    return {
      ...request,
      formData: {
        ...fallback,
        ...formData,
        companyName: formData.companyName || partner?.name || '',
        businessOwner: formData.businessOwner || partner?.businessOwner || '',
        technicalContact: formData.technicalContact || partner?.technicalContact || '',
        phone: formData.phone || partner?.phone || '',
        email: formData.email || partner?.email || '',
        serviceApi: formData.serviceApi || partner?.serviceApi || '',
        environment: formData.environment || request.environment || partner?.environment || 'UAT+PRD',
        publicPeerIps: formData.publicPeerIps?.length ? formData.publicPeerIps : fallback.publicPeerIps,
        privateEndpoints: formData.privateEndpoints?.length ? formData.privateEndpoints : fallback.privateEndpoints
      }
    };
  }

  private formDataFromPartner(partner?: Partner): RequestFormData {
    return {
      companyName: partner?.name || '',
      eMolaAccountOtp: partner?.eMolaAccountOtp || '',
      representativeName: partner?.representativeName || partner?.technicalContact || '',
      groupLink: partner?.groupLink || '',
      businessOwner: partner?.businessOwner || '',
      technicalContact: partner?.technicalContact || '',
      phone: partner?.phone || '',
      email: partner?.email || '',
      serviceApi: partner?.serviceApi || '',
      environment: partner?.environment || 'UAT+PRD',
      publicIp: partner?.publicIp || '',
      publicPeerIps: partner?.publicPeerIps || (partner?.publicIp ? [partner.publicIp] : []),
      partnerServerIp: partner?.partnerServerIp || '',
      uatPort: partner?.uatPort || '',
      prdPort: partner?.prdPort || '',
      privateEndpoints: partner?.privateEndpoints || [],
      authMethod: partner?.authMethod || '',
      ownCloudFolderUrl: partner?.ownCloudFolderUrl || '',
      formNotes: partner?.formNotes || ''
    };
  }

  private cloneState(source: PartnerSourceState): PartnerState {
    return {
      partners: structuredClone(source.partners),
      connections: structuredClone(source.connections || []),
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
      ['partner-a', 'Alpha Pay', 'Business Dept', 'Carlos Alpha', '+258 84 100 2001', 'alpha@example.com', 'Payment API', 'UAT+PRD', '139.84.234.187', '10.177.0.10', '8520', '9921'],
      ['partner-b', 'Beta Lotto', 'Business Dept', 'Ana Beta', '+258 84 100 2002', 'beta@example.com', 'USSD / API', 'UAT+PRD', '72.61.147.82', '10.177.0.20', '8600', '9600'],
      ['partner-c', 'Thunes', 'Business Dept', 'Ousmane', '+258 84 100 2003', 'thunes@example.com', 'Remittance API', 'UAT+PRD', '52.209.193.244', '52.209.248.254', '8443', '9443'],
      ['partner-d', 'OlaLotto', 'Business Dept', 'Shan', '+258 84 100 2004', 'ola@example.com', 'USSD / API', 'UAT+PRD', '13.245.98.196', '172.31.4.206', '10021', '10020'],
      ['partner-e', 'Onde Tem', 'Business Dept', 'Xefino Jose', '+258 84 100 2005', 'onde@example.com', 'USSD / API', 'UAT+PRD', '34.1.210.78', '10.218.0.2', '8055', '9055'],
      ['partner-f', 'Recarga Aki', 'Business Dept', 'Support Desk', '+258 84 100 2006', 'support@recarga.example', 'Connectivity', 'UAT', '102.207.223.37', '10.0.1.12', '8686', '8685'],
      ['partner-g', '888Bet', 'Business Dept', 'Partner Tech', '+258 84 100 2007', 'tech@888.example', 'Gaming API', 'UAT+PRD', '139.84.238.180', '139.84.238.180', '443', '22'],
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
      isBlocked: false,
      previousStatusBeforeBlock: undefined,
      blockReason: '',
      blockedAt: '',
      unblockedAt: '',
      blocker: '',
      formSent: false,
      formReceived: false,
      formValidated: false,
      statementCreated: false,
      connectionCreatedBy: '',
      statementDate: '',
      statementSent: false,
      signaturesComplete: false,
      srCode: '',
      gnocSrCode: '',
      ipCoreStatus: 'NOT_SUBMITTED',
      itStatus: 'NOT_SUBMITTED',
      vpnStatus: 'NOT_STARTED',
      connectivityUat: 'NOT_TESTED',
      connectivityPrd: 'NOT_TESTED',
      credentialsProvided: false,
      whitelistNumbers: '',
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
      base('request-e', 'partner-e', 'NEW_INTEGRATION', {formSent: true, formReceived: true, formValidated: true, statementCreated: true, statementSent: true, signaturesComplete: true, ipCoreStatus: 'DONE', itStatus: 'DONE', vpnStatus: 'IN_PROGRESS', connectivityUat: 'IN_PROGRESS', connectivityPrd: 'IN_PROGRESS'}),
      base('request-f', 'partner-f', 'CONNECTIVITY_SUPPORT', {formSent: true, formReceived: true, formValidated: true, statementCreated: true, statementSent: true, signaturesComplete: true, ipCoreStatus: 'DONE', itStatus: 'DONE', vpnStatus: 'DOWN', connectivityUat: 'FAIL', blocker: 'Partner reports VPN down'}),
      base('request-g', 'partner-g', 'NEW_INTEGRATION', {formSent: true, formReceived: true, formValidated: true, statementCreated: true, statementSent: true, signaturesComplete: true, ipCoreStatus: 'DONE', itStatus: 'DONE', vpnStatus: 'UP', connectivityUat: 'PASS', connectivityPrd: 'PASS', credentialsProvided: true, uatStatus: 'IN_PROGRESS'}),
      base('request-h', 'partner-h', 'NEW_INTEGRATION', {formSent: true, formReceived: true, formValidated: true, statementCreated: true, statementSent: true, signaturesComplete: true, ipCoreStatus: 'DONE', itStatus: 'DONE', vpnStatus: 'UP', connectivityUat: 'PASS', connectivityPrd: 'PASS', credentialsProvided: true, uatStatus: 'PASS', handoverComplete: true, closeDate: this.today()})
    ];

    const events = requests.map(request => this.event(request.id, 'Demo State', this.statusLabel(request.currentStatus)));
    return {partners, requests, events};
  }
}
