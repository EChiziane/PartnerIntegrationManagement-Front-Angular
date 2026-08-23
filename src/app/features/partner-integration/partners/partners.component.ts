import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerEnvironment, PartnerPrivateEndpoint, PartnerRequest, RequestType, WorkflowStatus} from '@shared/models/partner-integration';
import {PartnerIntegrationPdfService} from '@core/services/partner-integration-pdf.service';

type PartnerFilter = 'ALL' | 'ACTIVE' | 'OPEN_REQUESTS' | 'ATTENTION';
type PartnerCategory = 'ALL' | 'Payment API' | 'USSD / Push USSD' | 'Remittance' | 'Connectivity' | 'Gaming' | 'Other';
type ServiceOption = 'Business Code' | 'Push USSD';

interface PartnerDraft {
  name: string;
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
  searchValue = '';
  activeFilter: PartnerFilter = 'ALL';
  categoryFilter: PartnerCategory = 'ALL';

  requestType: RequestType = 'NEW_INTEGRATION';
  isCreateVisible = false;
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
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.reload();
  }

  get filteredPartners(): Partner[] {
    const query = this.searchValue.trim().toLowerCase();

    return this.partners.filter(partner => {
      const matchesQuery = !query
        || partner.name.toLowerCase().includes(query)
        || partner.serviceApi.toLowerCase().includes(query)
        || partner.technicalContact.toLowerCase().includes(query)
        || partner.businessOwner.toLowerCase().includes(query)
        || partner.publicIp.toLowerCase().includes(query)
        || partner.partnerServerIp.toLowerCase().includes(query)
        || this.publicPeersLabel(partner).toLowerCase().includes(query)
        || this.privateEndpointsLabel(partner).toLowerCase().includes(query);

      if (!matchesQuery) return false;
      if (this.categoryFilter !== 'ALL' && this.pdf.partnerCategory(partner) !== this.categoryFilter) return false;
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
    this.isCreateVisible = true;
  }

  createPartner(): void {
    if (!this.draft.name.trim()) return;
    const partner = this.partnerIntegration.createPartner(this.buildPartnerPayload());
    this.isCreateVisible = false;
    this.resetDraft();
    this.reload();
    this.router.navigate(['/app/partner', partner.id]);
  }

  closeCreate(): void {
    this.isCreateVisible = false;
  }

  createRequest(partner: Partner): void {
    const request = this.partnerIntegration.createRequest(partner.id, this.requestType);
    this.router.navigate(['/app/request', request.id]);
  }

  publicPeersLabel(partner: Partner): string {
    return partner.publicPeerIps?.length ? partner.publicPeerIps.join(', ') : partner.publicIp || '-';
  }

  privateEndpointsLabel(partner: Partner): string {
    if (partner.privateEndpoints?.length) {
      return partner.privateEndpoints
        .map(endpoint => `${endpoint.environment}: ${endpoint.ip || '-'}:${endpoint.port || '-'}`)
        .join(' | ');
    }

    return partner.partnerServerIp || '-';
  }

  portsLabel(partner: Partner): string {
    if (partner.privateEndpoints?.length) {
      return partner.privateEndpoints
        .map(endpoint => `${endpoint.environment} ${endpoint.port || '-'}`)
        .join(' / ');
    }

    return `${partner.uatPort || '-'} / ${partner.prdPort || '-'}`;
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
    return this.requestsForPartner(partnerId).filter(request => request.currentStatus !== 'CLOSED').length;
  }

  mostUrgentStatus(partnerId: string): WorkflowStatus | null {
    const openRequests = this.requestsForPartner(partnerId).filter(request => request.currentStatus !== 'CLOSED');
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
    )[0].currentStatus;
  }

  nextAction(partnerId: string): string {
    const status = this.mostUrgentStatus(partnerId);
    const request = this.requestsForPartner(partnerId).find(item => item.currentStatus === status);
    return request?.nextAction || 'No open request';
  }

  requestSummary(partnerId: string): string {
    const open = this.openRequestCount(partnerId);
    if (!open) return 'No open requests';
    return `${open} open request${open === 1 ? '' : 's'}`;
  }

  hasAttention(partnerId: string): boolean {
    return this.requestsForPartner(partnerId).some(request =>
      request.currentStatus !== 'CLOSED'
      && (request.currentStatus === 'TROUBLESHOOTING'
        || request.priority === 'P1'
        || this.ageDays(request.stageStartDate) >= 3)
    );
  }

  ageDays(date: string): number {
    if (!date) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
  }

  private requestsForPartner(partnerId: string): PartnerRequest[] {
    return this.requests.filter(request => request.partnerId === partnerId);
  }

  private resetDraft(): void {
    this.draft = {
      name: '',
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

  private buildPartnerPayload(): Omit<Partner, 'id' | 'lastActivity' | 'status'> {
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
      name: this.draft.name.trim(),
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
      formNotes: this.draft.formNotes.trim()
    };
  }
}
