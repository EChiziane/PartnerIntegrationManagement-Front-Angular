import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerRequest, WorkflowStatus} from '@shared/models/partner-integration';
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
    this.partners = this.partnerIntegration.getPartners();
    this.requests = this.partnerIntegration.getRequests();
    const status = this.route.snapshot.queryParamMap.get('status') as WorkflowStatus | null;
    if (status) this.selectedStatus = status;
  }

  get filteredRequests(): PartnerRequest[] {
    if (this.selectedStatus === 'ALL') return this.requests;
    return this.requests.filter(request => request.currentStatus === this.selectedStatus);
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

  selectStage(stage: WorkflowStage): void {
    const firstStatusWithRequests = stage.statuses.find(status => this.countByStatus(status) > 0);
    this.selectedStatus = firstStatusWithRequests || stage.statuses[0];
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
    const scope = this.selectedStatus === 'ALL'
      ? 'All Request Pipeline'
      : this.partnerIntegration.statusLabel(this.selectedStatus);
    this.pdf.downloadPipeline(this.filteredRequests, this.partners, scope);
  }
}
