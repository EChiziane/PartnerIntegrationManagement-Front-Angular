import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerRequest, RequestType, TaskPriority, WorkflowStatus} from '@shared/models/partner-integration';
import {PartnerIntegrationPdfService} from '@core/services/partner-integration-pdf.service';

interface WorkflowStage {
  label: string;
  tone: 'neutral' | 'waiting' | 'ready' | 'work' | 'risk' | 'done';
  statuses: WorkflowStatus[];
}

@Component({
  selector: 'app-pipeline',
  standalone: false,
  templateUrl: './pipeline.component.html',
  styleUrls: ['./pipeline.component.scss']
})
export class PipelineComponent implements OnInit {
  partners: Partner[] = [];
  requests: PartnerRequest[] = [];
  selectedStatus: WorkflowStatus | 'ALL' = 'ALL';
  selectedType: RequestType | 'ALL' = 'ALL';
  selectedPartnerId = 'ALL';
  selectedOwner = 'ALL';
  selectedPriority: TaskPriority | 'ALL' = 'ALL';
  selectedScope: 'ALL' | 'OPEN' | 'CLOSED' | 'BLOCKED' = 'OPEN';
  searchValue = '';
  pageIndex = 1;
  pageSize = 12;

  readonly statuses: WorkflowStatus[] = [
    'BLOCKED',
    'NEW',
    'WAITING_FORM',
    'FORM_VALIDATION',
    'READY_STATEMENT',
    'READY_IMPLEMENTATION',
    'WAITING_SIGNATURES',
    'IMPLEMENTATION',
    'READY_CONNECTIVITY',
    'CONNECTIVITY_TEST',
    'TROUBLESHOOTING',
    'READY_UAT',
    'UAT_IN_PROGRESS',
    'READY_HANDOVER',
    'CLOSED'
  ];

  readonly requestTypes: RequestType[] = ['NEW_INTEGRATION', 'UPDATE_INTEGRATION', 'CONNECTIVITY_SUPPORT', 'BLOCK_VPN', 'UNBLOCK_VPN'];
  readonly priorities: TaskPriority[] = ['P1', 'P2', 'P3', 'P4'];

  readonly workflowStages: WorkflowStage[] = [
    {label: 'Intake', tone: 'neutral', statuses: ['NEW', 'WAITING_FORM', 'FORM_VALIDATION', 'READY_STATEMENT']},
    {label: 'Approval', tone: 'waiting', statuses: ['READY_IMPLEMENTATION', 'WAITING_SIGNATURES']},
    {label: 'Implementation', tone: 'work', statuses: ['IMPLEMENTATION', 'READY_CONNECTIVITY']},
    {label: 'Testing', tone: 'ready', statuses: ['CONNECTIVITY_TEST', 'READY_UAT', 'UAT_IN_PROGRESS', 'READY_HANDOVER']},
    {label: 'Exception', tone: 'risk', statuses: ['BLOCKED', 'TROUBLESHOOTING']},
    {label: 'Closed', tone: 'done', statuses: ['CLOSED']}
  ];

  constructor(
    public partnerIntegration: PartnerIntegrationService,
    private pdf: PartnerIntegrationPdfService,
    private route: ActivatedRoute,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.partners = [...this.partnerIntegration.getPartners()].sort((a, b) => a.name.localeCompare(b.name));
    this.requests = [...this.partnerIntegration.getRequests()].sort((a, b) => this.requestSortScore(a) - this.requestSortScore(b));
    const status = this.route.snapshot.queryParamMap.get('status') as WorkflowStatus | null;
    const scope = this.route.snapshot.queryParamMap.get('scope') as typeof this.selectedScope | null;
    const owner = this.route.snapshot.queryParamMap.get('owner');
    const priority = this.route.snapshot.queryParamMap.get('priority') as TaskPriority | null;
    if (status) this.selectedStatus = status;
    if (scope) this.selectedScope = scope;
    if (owner) this.selectedOwner = owner;
    if (priority) this.selectedPriority = priority;
  }

  get filteredRequests(): PartnerRequest[] {
    const query = this.searchValue.trim().toLowerCase();

    return this.requests.filter(request => {
      const partnerName = this.partnerName(request.partnerId);
      const title = this.requestTitle(request);
      const matchesQuery = !query
        || title.toLowerCase().includes(query)
        || partnerName.toLowerCase().includes(query)
        || request.nextAction.toLowerCase().includes(query)
        || request.currentOwner.toLowerCase().includes(query)
        || (request.srCode || '').toLowerCase().includes(query)
        || (request.gnocSrCode || '').toLowerCase().includes(query);

      if (!matchesQuery) return false;
      if (this.selectedScope === 'OPEN' && request.currentStatus === 'CLOSED') return false;
      if (this.selectedScope === 'CLOSED' && request.currentStatus !== 'CLOSED') return false;
      if (this.selectedScope === 'BLOCKED' && request.currentStatus !== 'BLOCKED') return false;
      if (this.selectedStatus !== 'ALL' && request.currentStatus !== this.selectedStatus) return false;
      if (this.selectedType !== 'ALL' && request.type !== this.selectedType) return false;
      if (this.selectedPartnerId !== 'ALL' && request.partnerId !== this.selectedPartnerId) return false;
      if (this.selectedOwner !== 'ALL' && request.currentOwner !== this.selectedOwner) return false;
      if (this.selectedPriority !== 'ALL' && request.priority !== this.selectedPriority) return false;
      return true;
    });
  }

  get pagedRequests(): PartnerRequest[] {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  get owners(): string[] {
    return [...new Set(this.requests.map(request => request.currentOwner).filter(Boolean))].sort();
  }

  partnerName(partnerId: string): string {
    return this.partners.find(partner => partner.id === partnerId)?.name || 'Unknown Partner';
  }

  countByStage(stage: WorkflowStage): number {
    return stage.statuses.reduce((total, status) => total + this.countByStatus(status), 0);
  }

  countByStatus(status: WorkflowStatus): number {
    return this.requests.filter(request => request.currentStatus === status).length;
  }

  stageForStatus(status: WorkflowStatus): WorkflowStage {
    return this.workflowStages.find(stage => stage.statuses.includes(status)) || this.workflowStages[0];
  }

  stageLabel(stage: WorkflowStage): string {
    return this.partnerIntegration.stageLabel(stage.label);
  }

  selectStage(stage: WorkflowStage): void {
    const firstStatusWithRequests = stage.statuses.find(status => this.countByStatus(status) > 0);
    this.selectedStatus = firstStatusWithRequests || stage.statuses[0];
    this.resetPage();
  }

  resetPage(): void {
    this.pageIndex = 1;
  }

  trackByRequestId(_index: number, request: PartnerRequest): string {
    return request.id;
  }

  private requestSortScore(request: PartnerRequest): number {
    const statusScore: Partial<Record<WorkflowStatus, number>> = {
      TROUBLESHOOTING: 1,
      BLOCKED: 2,
      READY_CONNECTIVITY: 3,
      CONNECTIVITY_TEST: 4,
      READY_UAT: 5,
      UAT_IN_PROGRESS: 6,
      READY_HANDOVER: 7,
      FORM_VALIDATION: 8,
      READY_STATEMENT: 9,
      IMPLEMENTATION: 10,
      WAITING_SIGNATURES: 11,
      WAITING_FORM: 12,
      NEW: 13,
      CLOSED: 99
    };
    const priorityScore: Record<string, number> = {P1: 1, P2: 2, P3: 3, P4: 4};
    return (statusScore[request.currentStatus] || 50) * 100000000
      + (priorityScore[request.priority] || 9) * 1000000
      + (new Date(request.followUpDate || request.stageStartDate || request.openDate).getTime() || 0) / 100000;
  }

  requestTitle(request: PartnerRequest): string {
    return this.partnerIntegration.requestDisplayTitle(
      request,
      this.partners.find(partner => partner.id === request.partnerId)
    );
  }

  openRequest(request: PartnerRequest): void {
    this.router.navigate(['/app/request', request.id]);
  }

  downloadPipeline(): void {
    const scope = [
      this.selectedScope,
      this.selectedStatus === 'ALL' ? '' : this.partnerIntegration.statusLabel(this.selectedStatus),
      this.selectedType === 'ALL' ? '' : this.partnerIntegration.typeLabel(this.selectedType),
      this.selectedPartnerId === 'ALL' ? '' : this.partnerName(this.selectedPartnerId),
      this.selectedPriority === 'ALL' ? '' : this.selectedPriority,
      this.searchValue.trim() ? `SEARCH_${this.searchValue.trim()}` : ''
    ].filter(Boolean).join(' / ');
    this.pdf.downloadPipeline(this.filteredRequests, this.partners, scope);
  }
}
