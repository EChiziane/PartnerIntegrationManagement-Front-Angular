import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerRequest, WorkflowStatus} from '@shared/models/partner-integration';
import {PartnerIntegrationPdfService} from '@core/services/partner-integration-pdf.service';

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

  openRequest(request: PartnerRequest): void {
    this.router.navigate(['/app/request', request.id]);
  }

  downloadPipeline(): void {
    const scope = this.selectedStatus === 'ALL'
      ? 'All Pipeline'
      : this.partnerIntegration.statusLabel(this.selectedStatus);
    this.pdf.downloadPipeline(this.filteredRequests, this.partners, scope);
  }
}
