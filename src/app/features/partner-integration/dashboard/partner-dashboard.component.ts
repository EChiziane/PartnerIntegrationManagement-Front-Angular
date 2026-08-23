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
    'NEW',
    'WAITING_FORM',
    'FORM_VALIDATION',
    'READY_STATEMENT',
    'WAITING_SIGNATURES',
    'IMPLEMENTATION',
    'READY_CONNECTIVITY',
    'TROUBLESHOOTING',
    'READY_UAT',
    'UAT_IN_PROGRESS',
    'READY_HANDOVER',
    'CLOSED'
  ];

  readonly requestTypes: RequestType[] = [
    'NEW_INTEGRATION',
    'UPDATE_INTEGRATION',
    'BLOCK_VPN',
    'UNBLOCK_VPN',
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
      request.currentStatus === 'TROUBLESHOOTING'
      || this.ageDays(request.stageStartDate) >= 3
      || request.priority === 'P1'
    );
  }

  get myTasksToday(): WorkflowTask[] {
    return this.tasks.filter(task => task.owner === 'Me' || task.priority === 'P1').slice(0, 6);
  }

  countByStatus(status: WorkflowStatus): number {
    return this.requests.filter(request => request.currentStatus === status).length;
  }

  countByType(type: RequestType): number {
    return this.openRequests.filter(request => request.type === type).length;
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
