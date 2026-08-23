import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerRequest, RequestType, WorkflowStatus} from '@shared/models/partner-integration';
import {PartnerIntegrationPdfService} from '@core/services/partner-integration-pdf.service';

type PartnerFilter = 'ALL' | 'ACTIVE' | 'OPEN_REQUESTS' | 'ATTENTION';
type PartnerCategory = 'ALL' | 'Payment API' | 'USSD / Push USSD' | 'Remittance' | 'Connectivity' | 'Gaming' | 'Other';

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

  draft = {
    name: '',
    businessOwner: '',
    technicalContact: '',
    phone: '',
    email: '',
    serviceApi: '',
    environment: 'UAT + PRD' as Partner['environment'],
    publicIp: '',
    partnerServerIp: '',
    uatPort: '',
    prdPort: '',
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
        || partner.partnerServerIp.toLowerCase().includes(query);

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
    const partner = this.partnerIntegration.createPartner({...this.draft});
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
      serviceApi: '',
      environment: 'UAT + PRD',
      publicIp: '',
      partnerServerIp: '',
      uatPort: '',
      prdPort: '',
      authMethod: '',
      ownCloudFolderUrl: '',
      formNotes: ''
    };
  }
}
