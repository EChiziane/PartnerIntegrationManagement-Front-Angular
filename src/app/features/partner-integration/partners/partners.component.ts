import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerConnection, PartnerEnvironment, PartnerPrivateEndpoint, PartnerRequest, RequestFormData, RequestType, WorkflowStatus} from '@shared/models/partner-integration';
import {PartnerIntegrationPdfService} from '@core/services/partner-integration-pdf.service';
import {TranslationService} from '@core/services/translation.service';

type PartnerFilter = 'ALL' | 'ACTIVE' | 'OPEN_REQUESTS' | 'ATTENTION';
type PartnerCategory = 'ALL' | 'Payment API' | 'USSD / Push USSD' | 'Remittance' | 'Connectivity' | 'Gaming' | 'Other';
type ServiceOption = 'Business Code' | 'Push USSD';

interface PartnerDraft {
  name: string;
  eMolaAccountOtp: string;
  representativeName: string;
  groupLink: string;
  businessOwner: string;
  technicalContact: string;
  phone: string;
  email: string;
  serviceApi: ServiceOption;
  environment: PartnerEnvironment;
  publicPeerIpsText: string;
  privateEndpoints: PartnerPrivateEndpoint[];
  authMethod: string;
  ownCloudFolderUrl: string;
  formNotes: string;
}

@Component({
  selector: 'app-partners',
  standalone: false,
  templateUrl: './partners.component.html',
  styleUrls: ['./partners.component.scss']
})
export class PartnersComponent implements OnInit {
  partners: Partner[] = [];
  requests: PartnerRequest[] = [];
  connections: PartnerConnection[] = [];
  searchValue = '';
  activeFilter: PartnerFilter = 'ALL';
  categoryFilter: PartnerCategory = 'ALL';
  private requestsByPartnerId = new Map<string, PartnerRequest[]>();
  private connectionByPartnerId = new Map<string, PartnerConnection>();
  private formDataByPartnerId = new Map<string, RequestFormData>();
  private urgentRequestByPartnerId = new Map<string, PartnerRequest>();
  private openRequestCountByPartnerId = new Map<string, number>();
  private attentionByPartnerId = new Map<string, boolean>();
  private categoryByPartnerId = new Map<string, string>();

  requestType: RequestType = 'NEW_INTEGRATION';
  isCreateVisible = false;
  importNotice = '';
  private createRequestFromImportedForm = false;
  readonly businessOwnerSuggestions = [
    'Business Development',
    'Financial Services',
    'M-MOLA Business',
    'Enterprise Sales',
    'VAS and Digital Channels'
  ];
  readonly serviceOptions: ServiceOption[] = ['Business Code', 'Push USSD'];

  draft: PartnerDraft = {
    name: '',
    eMolaAccountOtp: '',
    representativeName: '',
    groupLink: '',
    businessOwner: '',
    technicalContact: '',
    phone: '',
    email: '',
    serviceApi: 'Business Code',
    environment: 'UAT+PRD' as Partner['environment'],
    publicPeerIpsText: '',
    privateEndpoints: [{environment: 'UAT+PRD', ip: '', port: ''}],
    authMethod: '',
    ownCloudFolderUrl: '',
    formNotes: ''
  };

  constructor(
    public partnerIntegration: PartnerIntegrationService,
    public pdf: PartnerIntegrationPdfService,
    private translation: TranslationService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.reload();
  }

  get filteredPartners(): Partner[] {
    const query = this.searchValue.trim().toLowerCase();

    return this.partners.filter(partner => {
      const formData = this.requestFormDataForPartner(partner);
      const matchesQuery = !query
        || partner.name.toLowerCase().includes(query)
        || formData.serviceApi.toLowerCase().includes(query)
        || formData.technicalContact.toLowerCase().includes(query)
        || partner.businessOwner.toLowerCase().includes(query)
        || formData.publicIp.toLowerCase().includes(query)
        || formData.partnerServerIp.toLowerCase().includes(query)
        || this.publicPeersLabel(partner).toLowerCase().includes(query)
        || this.privateEndpointsLabel(partner).toLowerCase().includes(query);

      if (!matchesQuery) return false;
      if (this.categoryFilter !== 'ALL' && this.categoryForPartner(partner) !== this.categoryFilter) return false;
      if (this.activeFilter === 'ACTIVE') return partner.status === 'ACTIVE';
      if (this.activeFilter === 'OPEN_REQUESTS') return this.openRequestCount(partner.id) > 0;
      if (this.activeFilter === 'ATTENTION') return this.hasAttention(partner.id);
      return true;
    });
  }

  get openPartnersCount(): number {
    return this.partners.filter(partner => this.openRequestCount(partner.id) > 0).length;
  }

  get attentionPartnersCount(): number {
    return this.partners.filter(partner => this.hasAttention(partner.id)).length;
  }

  reload(): void {
    this.partners = this.partnerIntegration.getPartners();
    this.requests = this.partnerIntegration.getRequests();
    this.connections = this.partnerIntegration.getConnections();
    this.rebuildIndexes();
  }

  setFilter(filter: PartnerFilter): void {
    this.activeFilter = filter;
  }

  downloadList(): void {
    const scope = [
      this.activeFilter,
      this.categoryFilter,
      this.searchValue.trim() ? `SEARCH_${this.searchValue.trim()}` : ''
    ].filter(Boolean).join(' / ');

    this.pdf.downloadPartnerList(this.filteredPartners, this.requests, scope || 'All Partners');
  }

  openPartner(partner: Partner): void {
    this.router.navigate(['/app/partner', partner.id]);
  }

  openCreate(): void {
    this.resetDraft();
    this.importNotice = '';
    this.createRequestFromImportedForm = false;
    this.isCreateVisible = true;
  }

  createPartner(): void {
    if (!this.draft.name.trim()) return;
    const partner = this.partnerIntegration.createPartner(this.buildPartnerPayload());
    const formData = this.buildRequestFormDataFromDraft(partner.name);
    const hasTechnicalData = this.hasTechnicalData(formData);
    const request = this.partnerIntegration.createRequest(partner.id, 'NEW_INTEGRATION', {
      title: this.importedFormRequestTitle(partner.name),
      formData,
      formSent: hasTechnicalData,
      formReceived: hasTechnicalData,
      formValidated: hasTechnicalData,
      notes: hasTechnicalData
        ? 'Created automatically from imported and validated VPN integration form.'
        : 'Created from quick partner registration. Waiting for VPN integration form.'
    });

    this.isCreateVisible = false;
    this.resetDraft();
    this.importNotice = '';
    this.createRequestFromImportedForm = false;
    this.reload();
    this.router.navigate(['/app/request', request.id]);
  }

  closeCreate(): void {
    this.isCreateVisible = false;
  }

  async importPartnerForm(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), {type: 'array'});
      const vpnRows = this.sheetRows(XLSX, workbook, 'IPSEC VPN Template');
      const rulesRows = this.sheetRows(XLSX, workbook, 'Rules & Policies');
      const fileHints = this.fileHints(file.name);
      const partnerName = this.partnerCell(vpnRows, 'Company Name') || this.partnerCell(vpnRows, 'Description') || fileHints.partnerName;
      const representativeName = this.partnerCell(vpnRows, 'Representative Name');
      const institutionEmail = this.partnerCell(vpnRows, 'Email Address');
      const institutionPhone = this.partnerCell(vpnRows, 'Contact Phone Number');
      const technicalContact = this.partnerCell(vpnRows, 'Name');
      const email = institutionEmail || this.partnerCell(vpnRows, 'Email Address');
      const phone = this.partnerCell(vpnRows, 'Cell Phone');
      const publicPeers = this.splitValues(this.partnerCell(vpnRows, 'VPN Peer Address'));
      const partnerDomainIp = this.firstIp(this.partnerCell(vpnRows, 'Encryption domain'));
      const privateEndpoints = this.privateEndpointsFromRules(rulesRows, partnerDomainIp);

      this.draft = {
        ...this.draft,
        name: this.cleanPlaceholder(partnerName, 'Partner Name'),
        eMolaAccountOtp: this.partnerCell(vpnRows, 'e-Mola Account (OTP)') || this.draft.eMolaAccountOtp,
        representativeName: representativeName || this.draft.representativeName,
        businessOwner: fileHints.businessOwner || this.draft.businessOwner,
        technicalContact: technicalContact || this.draft.technicalContact,
        phone: institutionPhone || phone || this.draft.phone,
        email: email || this.draft.email,
        serviceApi: fileHints.serviceApi || this.draft.serviceApi,
        environment: privateEndpoints.length ? this.environmentFromEndpoints(privateEndpoints) : this.draft.environment,
        publicPeerIpsText: publicPeers.length ? publicPeers.join('\n') : this.draft.publicPeerIpsText,
        privateEndpoints: privateEndpoints.length ? privateEndpoints : this.draft.privateEndpoints,
        authMethod: this.partnerCell(vpnRows, 'Authentication Method') || this.draft.authMethod
      };

      this.createRequestFromImportedForm = true;
      this.importNotice = this.translation.instant('messages.importedPartner', {
        file: file.name,
        endpoints: privateEndpoints.length,
        peers: publicPeers.length
      });
    } catch (error) {
      console.error('Partner form import failed', error);
      this.importNotice = this.translation.instant('messages.importFailed');
    } finally {
      input.value = '';
    }
  }

  createRequest(partner: Partner): void {
    const request = this.partnerIntegration.createRequest(partner.id, this.requestType);
    this.router.navigate(['/app/request', request.id]);
  }

  publicPeersLabel(partner: Partner): string {
    const formData = this.requestFormDataForPartner(partner);
    return formData.publicPeerIps?.length ? formData.publicPeerIps.join(', ') : formData.publicIp || '-';
  }

  privateEndpointsLabel(partner: Partner): string {
    const formData = this.requestFormDataForPartner(partner);
    if (formData.privateEndpoints?.length) {
      return formData.privateEndpoints
        .map(endpoint => `${endpoint.environment}: ${endpoint.ip || '-'}:${endpoint.port || '-'}`)
        .join(' | ');
    }

    return formData.partnerServerIp || '-';
  }

  connectionPeersLabel(partner: Partner): string {
    const connection = this.connectionForPartner(partner);
    return connection?.publicPeerIps?.length ? connection.publicPeerIps.join(', ') : connection?.publicIp || '-';
  }

  connectionEndpointsLabel(partner: Partner): string {
    const connection = this.connectionForPartner(partner);
    if (connection?.privateEndpoints?.length) {
      return connection.privateEndpoints
        .map(endpoint => `${endpoint.environment}: ${endpoint.ip || '-'}:${endpoint.port || '-'}`)
        .join(' | ');
    }

    return connection?.partnerServerIp || '-';
  }

  integrationName(partner: Partner): string {
    return `eMola - ${partner.name}`;
  }

  portsLabel(partner: Partner): string {
    const formData = this.requestFormDataForPartner(partner);
    if (formData.privateEndpoints?.length) {
      return formData.privateEndpoints
        .map(endpoint => `${endpoint.environment} ${endpoint.port || '-'}`)
        .join(' / ');
    }

    return `${formData.uatPort || '-'} / ${formData.prdPort || '-'}`;
  }

  requestFormDataForPartner(partner: Partner): RequestFormData {
    const cached = this.formDataByPartnerId.get(partner.id);
    if (cached) return cached;

    const request = this.requestsForPartner(partner.id).find(item => item.currentStatus !== 'CLOSED')
      || this.requestsForPartner(partner.id)[0];
    return request
      ? this.partnerIntegration.getRequestFormData(request, partner)
      : this.emptyRequestFormData(partner);
  }

  connectionForPartner(partner: Partner): PartnerConnection | undefined {
    return this.connectionByPartnerId.get(partner.id);
  }

  addPrivateEndpoint(): void {
    this.draft.privateEndpoints.push({environment: 'UAT+PRD', ip: '', port: ''});
  }

  removePrivateEndpoint(index: number): void {
    if (this.draft.privateEndpoints.length === 1) {
      this.draft.privateEndpoints[0] = {environment: 'UAT+PRD', ip: '', port: ''};
      return;
    }

    this.draft.privateEndpoints.splice(index, 1);
  }

  openRequestCount(partnerId: string): number {
    return this.openRequestCountByPartnerId.get(partnerId) || 0;
  }

  mostUrgentStatus(partnerId: string): WorkflowStatus | null {
    return this.urgentRequest(partnerId)?.currentStatus || null;
  }

  urgentRequest(partnerId: string): PartnerRequest | null {
    return this.urgentRequestByPartnerId.get(partnerId) || null;
  }

  nextAction(partnerId: string): string {
    return this.urgentRequest(partnerId)?.nextAction || 'No open request';
  }

  requestSummary(partnerId: string): string {
    const open = this.openRequestCount(partnerId);
    if (!open) return 'No open requests';
    return `${open} open request${open === 1 ? '' : 's'}`;
  }

  hasAttention(partnerId: string): boolean {
    return this.attentionByPartnerId.get(partnerId) || false;
  }

  categoryForPartner(partner: Partner): string {
    return this.categoryByPartnerId.get(partner.id) || this.pdf.partnerCategory(partner);
  }

  trackByPartnerId(_index: number, partner: Partner): string {
    return partner.id;
  }

  ageDays(date: string): number {
    if (!date) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
  }

  private rebuildIndexes(): void {
    this.connectionByPartnerId = new Map(this.connections.map(connection => [connection.partnerId, connection]));
    this.requestsByPartnerId = new Map();
    this.formDataByPartnerId = new Map();
    this.urgentRequestByPartnerId = new Map();
    this.openRequestCountByPartnerId = new Map();
    this.attentionByPartnerId = new Map();
    this.categoryByPartnerId = new Map();

    for (const request of this.requests) {
      this.requestsByPartnerId.set(request.partnerId, [
        ...(this.requestsByPartnerId.get(request.partnerId) || []),
        request
      ]);
    }

    for (const partner of this.partners) {
      const partnerRequests = this.requestsForPartner(partner.id);
      const openRequests = partnerRequests.filter(request => request.currentStatus !== 'CLOSED');
      const activeFormRequest = openRequests[0] || partnerRequests[0];
      const formData = activeFormRequest
        ? this.partnerIntegration.getRequestFormData(activeFormRequest, partner)
        : this.emptyRequestFormData(partner);

      this.formDataByPartnerId.set(partner.id, formData);
      this.openRequestCountByPartnerId.set(partner.id, openRequests.length);
      this.categoryByPartnerId.set(partner.id, this.pdf.partnerCategory(partner));
      this.attentionByPartnerId.set(partner.id, openRequests.some(request =>
        request.currentStatus === 'TROUBLESHOOTING'
        || request.priority === 'P1'
        || this.ageDays(request.stageStartDate) >= 3
      ));

      const urgent = this.pickUrgentRequest(openRequests);
      if (urgent) this.urgentRequestByPartnerId.set(partner.id, urgent);
    }
  }

  private pickUrgentRequest(openRequests: PartnerRequest[]): PartnerRequest | null {
    if (!openRequests.length) return null;
    const score: Partial<Record<WorkflowStatus, number>> = {
      TROUBLESHOOTING: 1,
      READY_CONNECTIVITY: 2,
      CONNECTIVITY_TEST: 3,
      READY_UAT: 4,
      UAT_IN_PROGRESS: 5,
      READY_HANDOVER: 6,
      FORM_VALIDATION: 7,
      READY_STATEMENT: 8,
      IMPLEMENTATION: 9,
      WAITING_SIGNATURES: 10,
      WAITING_FORM: 11,
      NEW: 12
    };

    return [...openRequests].sort((a, b) =>
      (score[a.currentStatus] || 20) - (score[b.currentStatus] || 20)
    )[0];
  }

  private requestsForPartner(partnerId: string): PartnerRequest[] {
    return this.requestsByPartnerId.get(partnerId) || [];
  }

  private emptyRequestFormData(partner: Partner): RequestFormData {
    return this.partnerIntegration.getRequestFormData({
      id: '',
      partnerId: partner.id,
      type: 'NEW_INTEGRATION',
      openDate: '',
      currentStatus: 'NEW',
      currentOwner: '',
      nextAction: '',
      priority: 'P4',
      followUpDate: '',
      stageStartDate: '',
      blocker: '',
      formSent: false,
      formReceived: false,
      formValidated: false,
      statementCreated: false,
      statementSent: false,
      signaturesComplete: false,
      srCode: '',
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
    }, partner);
  }

  private resetDraft(): void {
    this.draft = {
      name: '',
      eMolaAccountOtp: '',
      representativeName: '',
      groupLink: '',
      businessOwner: '',
      technicalContact: '',
      phone: '',
      email: '',
      serviceApi: 'Business Code',
      environment: 'UAT+PRD',
      publicPeerIpsText: '',
      privateEndpoints: [{environment: 'UAT+PRD', ip: '', port: ''}],
      authMethod: '',
      ownCloudFolderUrl: '',
      formNotes: ''
    };
  }

  private importedFormRequestTitle(partnerName: string): string {
    return `Create connection between eMola and ${partnerName.trim()}`;
  }

  private sheetRows(
    XLSX: typeof import('xlsx'),
    workbook: import('xlsx').WorkBook,
    sheetNamePart: string
  ): string[][] {
    const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes(sheetNamePart.toLowerCase()));
    if (!sheetName) return [];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1, blankrows: false, defval: ''})
      .map(row => (row as unknown[]).map(value => String(value ?? '').trim()));
  }

  private partnerCell(rows: string[][], label: string): string {
    const row = rows.find(item => item[0]?.toLowerCase().replace(/\s+/g, ' ').trim() === label.toLowerCase());
    return this.cleanPlaceholder(row?.[2] || row?.[1] || '', label);
  }

  private fileHints(fileName: string): { businessOwner: string; serviceApi: ServiceOption | ''; partnerName: string } {
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const parts = baseName.split('_').map(part => part.trim()).filter(Boolean);
    const servicePart = parts.find(part => /push\s*ussd/i.test(part)) || '';
    const ownerPart = parts.find(part => /m-?mola/i.test(part)) || '';
    const partnerPart = parts.find(part => !/^vpn$/i.test(part)
      && !/^mvt$/i.test(part)
      && !/m-?mola/i.test(part)
      && !/push\s*ussd/i.test(part)
      && !/^\d+$/.test(part)) || '';

    return {
      businessOwner: ownerPart ? ownerPart.toUpperCase().replace('MMOLA', 'M-MOLA') : '',
      serviceApi: servicePart ? 'Push USSD' : '',
      partnerName: this.cleanPlaceholder(partnerPart, 'PartnerName')
    };
  }

  private privateEndpointsFromRules(rows: string[][], partnerDomainIp: string): PartnerPrivateEndpoint[] {
    const endpoints: PartnerPrivateEndpoint[] = [];

    rows
      .filter(row => /^rule\s+\d+/i.test(row[0] || ''))
      .forEach(row => {
        const sourceIps = this.splitValues(row[1]);
        const destinationIps = this.splitValues(row[3]);
        const ports = this.portsFromService(row[5]);
        const environment = this.environmentFromPurpose(row[7]);
        const endpointIps = partnerDomainIp
          ? [partnerDomainIp]
          : this.endpointIpsFromRule(row[7], sourceIps, destinationIps);

        endpointIps.forEach(ip => {
          ports.forEach(port => endpoints.push({environment, ip, port}));
        });
      });

    return endpoints.filter((endpoint, index, list) =>
      list.findIndex(item => item.environment === endpoint.environment
        && item.ip === endpoint.ip
        && item.port === endpoint.port) === index
    );
  }

  private environmentFromPurpose(value: string): PartnerEnvironment {
    const normalized = value.toUpperCase();
    if (normalized.includes('UAT') && normalized.includes('PRD')) return 'UAT+PRD';
    if (normalized.includes('PRD')) return 'PRD';
    return 'UAT';
  }

  private environmentFromEndpoints(endpoints: PartnerPrivateEndpoint[]): PartnerEnvironment {
    const environments = new Set(endpoints.map(endpoint => endpoint.environment));
    if (environments.has('UAT+PRD') || (environments.has('UAT') && environments.has('PRD'))) return 'UAT+PRD';
    if (environments.has('PRD')) return 'PRD';
    return 'UAT';
  }

  private endpointIpsFromRule(purpose: string, sourceIps: string[], destinationIps: string[]): string[] {
    return /callback/i.test(purpose) ? destinationIps : sourceIps;
  }

  private portsFromService(value: string): string[] {
    return [...String(value || '').matchAll(/\d{2,5}/g)].map(match => match[0]);
  }

  private splitValues(value: string): string[] {
    return String(value || '')
      .split(/[\n,;]+/)
      .map(item => item.trim().replace(/\/32$/, ''))
      .filter(Boolean);
  }

  private firstIp(value: string): string {
    return this.splitValues(value).find(item => /\d+\.\d+\.\d+\.\d+/.test(item)) || '';
  }

  private cleanPlaceholder(value: string, placeholder: string): string {
    const clean = String(value || '').trim();
    return clean.toLowerCase().replace(/\s+/g, '') === placeholder.toLowerCase().replace(/\s+/g, '') ? '' : clean;
  }

  private buildPartnerPayload(): Omit<Partner, 'id' | 'lastActivity' | 'status'> {
    const formData = this.buildRequestFormDataFromDraft(this.draft.name.trim());
    return {
      name: this.draft.name.trim(),
      eMolaAccountOtp: this.draft.eMolaAccountOtp.trim(),
      representativeName: this.draft.representativeName.trim(),
      groupLink: this.draft.groupLink.trim(),
      businessOwner: this.draft.businessOwner.trim(),
      technicalContact: formData.technicalContact,
      phone: formData.phone,
      email: formData.email,
      serviceApi: formData.serviceApi,
      environment: formData.environment,
      publicIp: formData.publicIp,
      publicPeerIps: formData.publicPeerIps,
      partnerServerIp: formData.partnerServerIp,
      uatPort: formData.uatPort,
      prdPort: formData.prdPort,
      privateEndpoints: formData.privateEndpoints,
      authMethod: formData.authMethod,
      ownCloudFolderUrl: formData.ownCloudFolderUrl,
      formNotes: formData.formNotes
    };
  }

  private buildRequestFormDataFromDraft(companyName: string): RequestFormData {
    const publicPeerIps = this.draft.publicPeerIpsText
      .split(/[\n,;]+/)
      .map(value => value.trim())
      .filter(Boolean);
    const privateEndpoints = this.draft.privateEndpoints
      .map(endpoint => ({
        environment: endpoint.environment,
        ip: endpoint.ip.trim(),
        port: endpoint.port.trim()
      }))
      .filter(endpoint => endpoint.ip || endpoint.port);
    const firstPrivateIp = privateEndpoints.find(endpoint => endpoint.ip)?.ip || '';
    const uatPort = privateEndpoints.find(endpoint => endpoint.environment !== 'PRD' && endpoint.port)?.port || '';
    const prdPort = privateEndpoints.find(endpoint => endpoint.environment !== 'UAT' && endpoint.port)?.port || '';

    return {
      companyName,
      eMolaAccountOtp: this.draft.eMolaAccountOtp.trim(),
      representativeName: this.draft.representativeName.trim(),
      groupLink: this.draft.groupLink.trim(),
      businessOwner: this.draft.businessOwner.trim(),
      technicalContact: this.draft.technicalContact.trim(),
      phone: this.draft.phone.trim(),
      email: this.draft.email.trim(),
      serviceApi: this.draft.serviceApi,
      environment: this.draft.environment,
      publicIp: publicPeerIps[0] || '',
      publicPeerIps,
      partnerServerIp: firstPrivateIp,
      uatPort,
      prdPort,
      privateEndpoints,
      authMethod: this.draft.authMethod.trim(),
      ownCloudFolderUrl: this.draft.ownCloudFolderUrl.trim(),
      formNotes: this.draft.formNotes.trim(),
      importedAt: this.createRequestFromImportedForm ? new Date().toISOString() : ''
    };
  }

  private hasTechnicalData(formData: RequestFormData): boolean {
    return !!formData.publicIp
      || !!formData.partnerServerIp
      || !!formData.publicPeerIps?.length
      || !!formData.privateEndpoints?.length;
  }
}
