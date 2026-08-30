import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerConnection, PartnerRequest, RequestType, WorkflowStatus, WorkflowTask} from '@shared/models/partner-integration';

interface WorkflowStage {
  label: string;
  description: string;
  tone: 'neutral' | 'waiting' | 'ready' | 'work' | 'risk' | 'done';
  statuses: WorkflowStatus[];
}

@Component({
  selector: 'app-partner-dashboard',
  standalone: false,
  templateUrl: './partner-dashboard.component.html',
  styleUrls: ['./partner-dashboard.component.scss']
})
export class PartnerDashboardComponent implements OnInit {
  partners: Partner[] = [];
  connections: PartnerConnection[] = [];
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

  readonly workflowStages: WorkflowStage[] = [
    {
      label: 'Intake',
      description: 'Request opened and form validation',
      tone: 'neutral',
      statuses: ['NEW', 'WAITING_FORM', 'FORM_VALIDATION', 'READY_STATEMENT']
    },
    {
      label: 'Approval',
      description: 'Statement and signatures',
      tone: 'waiting',
      statuses: ['READY_IMPLEMENTATION', 'WAITING_SIGNATURES']
    },
    {
      label: 'Implementation',
      description: 'IP Core, IT and readiness',
      tone: 'work',
      statuses: ['IMPLEMENTATION', 'READY_CONNECTIVITY']
    },
    {
      label: 'Testing',
      description: 'VPN, connectivity and UAT',
      tone: 'ready',
      statuses: ['CONNECTIVITY_TEST', 'READY_UAT', 'UAT_IN_PROGRESS', 'READY_HANDOVER']
    },
    {
      label: 'Exception',
      description: 'Blocked or troubleshooting',
      tone: 'risk',
      statuses: ['BLOCKED', 'TROUBLESHOOTING']
    },
    {
      label: 'Closed',
      description: 'Request archived',
      tone: 'done',
      statuses: ['CLOSED']
    }
  ];

  readonly requestTypes: RequestType[] = [
    'NEW_INTEGRATION',
    'UPDATE_INTEGRATION',
    'CONNECTIVITY_SUPPORT',
    'BLOCK_VPN',
    'UNBLOCK_VPN'
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
    this.partners = [...this.partnerIntegration.getPartners()].sort((a, b) => a.name.localeCompare(b.name));
    this.connections = [...this.partnerIntegration.getConnections()].sort((a, b) =>
      this.partnerName(a.partnerId).localeCompare(this.partnerName(b.partnerId))
      || a.name.localeCompare(b.name)
    );
    this.requests = [...this.partnerIntegration.getRequests()].sort((a, b) =>
      this.priorityScore(a) - this.priorityScore(b)
      || this.requestTimestamp(a) - this.requestTimestamp(b)
    );
    this.tasks = this.partnerIntegration.getTasks();
  }

  get openRequests(): PartnerRequest[] {
    return this.requests.filter(request => request.currentStatus !== 'CLOSED');
  }

  get blockedRequestsCount(): number {
    return this.requests.filter(request => request.currentStatus === 'BLOCKED').length;
  }

  get troubleshootingRequestsCount(): number {
    return this.requests.filter(request => request.currentStatus === 'TROUBLESHOOTING').length;
  }

  get activeIntegrationsCount(): number {
    return this.connections.filter(connection => connection.health !== 'NOT_ESTABLISHED').length;
  }

  get healthyIntegrationsCount(): number {
    return this.connections.filter(connection => connection.health === 'HEALTHY').length;
  }

  get degradedIntegrationsCount(): number {
    return this.connections.filter(connection => connection.health === 'DEGRADED').length;
  }

  get downIntegrationsCount(): number {
    return this.connections.filter(connection => connection.health === 'DOWN').length;
  }

  get notEstablishedConnectionsCount(): number {
    return this.connections.filter(connection => connection.health === 'NOT_ESTABLISHED').length;
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

  get myOpenRequestsCount(): number {
    return this.openRequests.filter(request => request.currentOwner === 'Me').length;
  }

  get overdueRequestsCount(): number {
    return this.openRequests.filter(request => this.isOverdue(request.followUpDate)).length;
  }

  get p1OpenRequestsCount(): number {
    return this.openRequests.filter(request => request.priority === 'P1').length;
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
      .sort((a, b) => this.priorityScore(a) - this.priorityScore(b)
        || this.ageDays(b.stageStartDate) - this.ageDays(a.stageStartDate))
      .slice(0, 8);
  }

  get liveRequests(): PartnerRequest[] {
    return this.openRequests
      .filter(request => !this.commandQueue.some(queueItem => queueItem.id === request.id))
      .slice(0, 8);
  }

  countByStatus(status: WorkflowStatus): number {
    return this.requests.filter(request => request.currentStatus === status).length;
  }

  countByStage(stage: WorkflowStage): number {
    return stage.statuses.reduce((total, status) => total + this.countByStatus(status), 0);
  }

  countByType(type: RequestType): number {
    return this.openRequests.filter(request => request.type === type).length;
  }

  partnerName(partnerId: string): string {
    return this.partners.find(partner => partner.id === partnerId)?.name || 'Partner';
  }

  stageLabel(stage: WorkflowStage): string {
    return this.partnerIntegration.stageLabel(stage.label);
  }

  stageDescription(stage: WorkflowStage): string {
    return this.partnerIntegration.stageDescription(stage.label, stage.description);
  }

  goPipeline(status?: WorkflowStatus): void {
    this.router.navigate(['/app/requests'], {queryParams: status ? {status} : {}});
  }

  goOpenRequests(): void {
    this.router.navigate(['/app/requests'], {queryParams: {scope: 'OPEN'}});
  }

  goMyRequests(): void {
    this.router.navigate(['/app/requests'], {queryParams: {scope: 'OPEN', owner: 'Me'}});
  }

  goPriority(priority: string): void {
    this.router.navigate(['/app/requests'], {queryParams: {scope: 'OPEN', priority}});
  }

  goTasks(): void {
    this.router.navigate(['/app/tasks']);
  }

  goConnections(): void {
    this.router.navigate(['/app/connections']);
  }

  goConnectionsByHealth(health: string): void {
    this.router.navigate(['/app/connections'], {queryParams: {health}});
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

  private isOverdue(date: string): boolean {
    if (!date) return false;
    return new Date(date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
  }

  private priorityScore(request: PartnerRequest): number {
    if (request.currentStatus === 'TROUBLESHOOTING') return 1;
    if (request.currentStatus === 'BLOCKED') return 2;
    if (request.priority === 'P1') return 3;
    if (this.isOverdue(request.followUpDate)) return 4;
    return 10;
  }

  private requestTimestamp(request: PartnerRequest): number {
    return new Date(request.followUpDate || request.stageStartDate || request.openDate).getTime() || 0;
  }
}
