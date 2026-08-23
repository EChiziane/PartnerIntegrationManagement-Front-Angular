import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerRequest, RequestType, WorkflowStatus, WorkflowTask} from '@shared/models/partner-integration';

@Component({
  selector: 'app-partner-dashboard',
  standalone: false,
  templateUrl: './partner-dashboard.component.html',
  styleUrls: ['./partner-dashboard.component.scss']
})
export class PartnerDashboardComponent implements OnInit {
  partners: Partner[] = [];
  requests: PartnerRequest[] = [];
  tasks: WorkflowTask[] = [];

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

  readonly requestTypes: RequestType[] = [
    'NEW_INTEGRATION',
    'UPDATE_INTEGRATION',
    'CONNECTIVITY_SUPPORT'
  ];

  constructor(
    public partnerIntegration: PartnerIntegrationService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.partners = this.partnerIntegration.getPartners();
    this.requests = this.partnerIntegration.getRequests();
    this.tasks = this.partnerIntegration.getTasks();
  }

  get openRequests(): PartnerRequest[] {
    return this.requests.filter(request => request.currentStatus !== 'CLOSED');
  }

  get attentionRequests(): PartnerRequest[] {
    return this.openRequests.filter(request =>
      request.currentStatus === 'BLOCKED'
      || request.currentStatus === 'TROUBLESHOOTING'
      || this.ageDays(request.stageStartDate) >= 3
      || request.priority === 'P1'
    );
  }

  get myTasksToday(): WorkflowTask[] {
    return this.tasks.filter(task => task.owner === 'Me' || task.priority === 'P1').slice(0, 6);
  }

  get waitingExternalCount(): number {
    return this.openRequests.filter(request =>
      ['WAITING_FORM', 'WAITING_SIGNATURES', 'WAITING_VENDOR', 'WAITING_BUSINESS'].includes(request.currentStatus)
    ).length;
  }

  get readyForActionCount(): number {
    return this.openRequests.filter(request =>
      ['FORM_VALIDATION', 'READY_STATEMENT', 'READY_CONNECTIVITY', 'READY_UAT', 'READY_HANDOVER'].includes(request.currentStatus)
    ).length;
  }

  get testingCount(): number {
    return this.openRequests.filter(request =>
      ['CONNECTIVITY_TEST', 'UAT_IN_PROGRESS'].includes(request.currentStatus)
    ).length;
  }

  get closedCount(): number {
    return this.requests.filter(request => request.currentStatus === 'CLOSED').length;
  }

  get commandQueue(): PartnerRequest[] {
    return [...this.attentionRequests]
      .sort((a, b) => this.ageDays(b.stageStartDate) - this.ageDays(a.stageStartDate))
      .slice(0, 5);
  }

  get liveRequests(): PartnerRequest[] {
    return this.openRequests
      .filter(request => !this.commandQueue.some(queueItem => queueItem.id === request.id))
      .slice(0, 5);
  }

  countByStatus(status: WorkflowStatus): number {
    return this.requests.filter(request => request.currentStatus === status).length;
  }

  countByType(type: RequestType): number {
    return this.openRequests.filter(request => request.type === type).length;
  }

  partnerName(partnerId: string): string {
    return this.partners.find(partner => partner.id === partnerId)?.name || 'Partner';
  }

  goPipeline(status?: WorkflowStatus): void {
    this.router.navigate(['/app/pipeline'], {queryParams: status ? {status} : {}});
  }

  goTasks(): void {
    this.router.navigate(['/app/tasks']);
  }

  goPartners(): void {
    this.router.navigate(['/app/partners']);
  }

  openRequest(requestId: string): void {
    this.router.navigate(['/app/request', requestId]);
  }

  ageDays(date: string): number {
    if (!date) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
  }
}
