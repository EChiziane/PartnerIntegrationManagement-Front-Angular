import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerRequest, RequestType, TimelineEvent} from '@shared/models/partner-integration';
import {PartnerIntegrationPdfService} from '@core/services/partner-integration-pdf.service';
import {NzModalService} from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-partner-detail',
  standalone: false,
  templateUrl: './partner-detail.component.html',
  styleUrls: ['./partner-detail.component.scss']
})
export class PartnerDetailComponent implements OnInit {
  partner: Partner | undefined;
  partnerDraft: Partial<Partner> = {};
  requests: PartnerRequest[] = [];
  events: TimelineEvent[] = [];
  requestType: RequestType = 'NEW_INTEGRATION';
  isEditingProfile = false;
  isCredentialsEditorOpen = false;
  credentialsDraft = '';

  constructor(
    public partnerIntegration: PartnerIntegrationService,
    private pdf: PartnerIntegrationPdfService,
    private modal: NzModalService,
    private route: ActivatedRoute,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.partner = this.partnerIntegration.getPartner(id);
    this.partnerDraft = this.partner ? {...this.partner} : {};
    this.requests = this.partnerIntegration.getRequests().filter(request => request.partnerId === id);
    this.events = this.requests.flatMap(request => this.partnerIntegration.getEvents(request.id));
  }

  get activeRequest(): PartnerRequest | undefined {
    return this.requests.find(request => request.currentStatus !== 'CLOSED') || this.requests[0];
  }

  get hasOpenRequest(): boolean {
    return this.requests.some(request => request.currentStatus !== 'CLOSED');
  }

  get canCreateNewRequest(): boolean {
    const active = this.activeRequest;
    return !active || active.currentStatus === 'CLOSED' || active.currentStatus === 'BLOCKED';
  }

  get openRequestsCount(): number {
    return this.requests.filter(request => request.currentStatus !== 'CLOSED').length;
  }

  publicPeersLabel(partner: Partner): string {
    return partner.publicPeerIps?.length ? partner.publicPeerIps.join(', ') : partner.publicIp || '-';
  }

  privateEndpoints(partner: Partner): Array<{environment: string; ip: string; port: string}> {
    if (partner.privateEndpoints?.length) {
      return partner.privateEndpoints;
    }

    const endpoints: Array<{environment: string; ip: string; port: string}> = [];
    if (partner.partnerServerIp || partner.uatPort) {
      endpoints.push({environment: 'UAT', ip: partner.partnerServerIp || '-', port: partner.uatPort || '-'});
    }
    if (partner.partnerServerIp || partner.prdPort) {
      endpoints.push({environment: 'PRD', ip: partner.partnerServerIp || '-', port: partner.prdPort || '-'});
    }

    return endpoints;
  }

  requiresUat(): boolean {
    return this.partner?.environment !== 'PRD';
  }

  requiresPrd(): boolean {
    return this.partner?.environment !== 'UAT';
  }

  openRequest(request: PartnerRequest): void {
    this.router.navigate(['/app/request', request.id]);
  }

  createRequest(): void {
    if (!this.partner) return;
    if (!this.canCreateNewRequest) {
      this.openActiveRequest();
      return;
    }

    if (this.activeRequest?.currentStatus === 'BLOCKED') {
      this.modal.confirm({
        nzTitle: 'Create another request?',
        nzContent: 'This partner already has a blocked request. Create a new request only if the blocked work cannot continue.',
        nzOkText: 'Create new request',
        nzCancelText: 'Open blocked request',
        nzOnOk: () => this.createRequestNow(),
        nzOnCancel: () => this.openActiveRequest()
      });
      return;
    }

    this.createRequestNow();
  }

  private createRequestNow(): void {
    if (!this.partner) return;
    const request = this.partnerIntegration.createRequest(this.partner.id, this.requestType);
    this.router.navigate(['/app/request', request.id]);
  }

  startUpdateFlow(): void {
    if (!this.partner) return;
    if (this.hasOpenRequest && this.activeRequest?.currentStatus !== 'BLOCKED') {
      this.openActiveRequest();
      return;
    }

    if (this.activeRequest?.currentStatus === 'BLOCKED') {
      this.modal.confirm({
        nzTitle: 'Blocked request exists',
        nzContent: 'This partner already has a blocked active request. You can unblock it or create a separate update request if this is genuinely new work.',
        nzOkText: 'Create update request',
        nzCancelText: 'Open blocked request',
        nzOnOk: () => this.createUpdateRequestNow(),
        nzOnCancel: () => this.openActiveRequest()
      });
      return;
    }

    this.createUpdateRequestNow();
  }

  private createUpdateRequestNow(): void {
    if (!this.partner) return;
    const request = this.partnerIntegration.createRequest(this.partner.id, 'UPDATE_INTEGRATION');
    this.router.navigate(['/app/request', request.id]);
  }

  openActiveRequest(): void {
    if (this.activeRequest) this.openRequest(this.activeRequest);
  }

  editProfile(): void {
    if (!this.partner) return;
    this.partnerDraft = {...this.partner};
    this.isEditingProfile = true;
  }

  cancelProfileEdit(): void {
    this.partnerDraft = this.partner ? {...this.partner} : {};
    this.isEditingProfile = false;
  }

  saveProfile(): void {
    if (!this.partner) return;
    this.partner = this.partnerIntegration.updatePartner(this.partner.id, this.partnerDraft);
    this.partnerDraft = {...this.partner};
    this.isEditingProfile = false;
    this.load();
  }

  openCredentialsEditor(): void {
    const request = this.activeRequest;
    if (!request) return;
    this.credentialsDraft = request.testCredentials || '';
    this.isCredentialsEditorOpen = true;
  }

  cancelCredentialsEditor(): void {
    this.isCredentialsEditorOpen = false;
    this.credentialsDraft = '';
  }

  saveCredentials(): void {
    const request = this.activeRequest;
    if (!request || !this.credentialsDraft.trim()) return;

    this.partnerIntegration.updateRequest(request.id, {
      credentialsProvided: true,
      testCredentials: this.credentialsDraft.trim(),
      uatStatus: 'IN_PROGRESS'
    }, 'Test Credentials Provided');
    this.isCredentialsEditorOpen = false;
    this.credentialsDraft = '';
    this.load();
  }

  shouldShowCredentialsPanel(request: PartnerRequest): boolean {
    return request.currentStatus === 'READY_UAT'
      || request.currentStatus === 'UAT_IN_PROGRESS'
      || request.currentStatus === 'READY_HANDOVER'
      || request.currentStatus === 'CLOSED'
      || request.credentialsProvided
      || !!request.testCredentials?.trim();
  }

  confirmAction(label: string, patch: Partial<PartnerRequest>): void {
    const request = this.activeRequest;
    if (!request) return;

    this.modal.confirm({
      nzTitle: 'Confirm workflow update',
      nzContent: `This will register "${label}" for ${this.partner?.name || 'this partner'} and may move the request from ${this.partnerIntegration.statusLabel(request.currentStatus)} to the next status.`,
      nzOkText: 'Confirm update',
      nzCancelText: 'Cancel',
      nzOnOk: () => this.applyAction(label, patch)
    });
  }

  blockActiveRequest(): void {
    const request = this.activeRequest;
    if (!request) return;

    const reason = window.prompt('Why is this request blocked?');
    if (!reason?.trim()) return;

    this.modal.confirm({
      nzTitle: 'Block active request',
      nzContent: `This will pause ${request.title || this.partner?.name || 'this request'} until it is unblocked. The blocker reason will be stored in the request history.`,
      nzOkText: 'Block request',
      nzOkDanger: true,
      nzCancelText: 'Cancel',
      nzOnOk: () => {
        this.partnerIntegration.blockRequest(request.id, reason);
        this.load();
      }
    });
  }

  unblockActiveRequest(): void {
    const request = this.activeRequest;
    if (!request) return;

    const note = window.prompt('Optional unblock note');
    this.modal.confirm({
      nzTitle: 'Unblock request',
      nzContent: 'This will reactivate the request and return it to the workflow state calculated from its existing progress.',
      nzOkText: 'Unblock request',
      nzCancelText: 'Cancel',
      nzOnOk: () => {
        this.partnerIntegration.unblockRequest(request.id, note || '');
        this.load();
      }
    });
  }

  private applyAction(label: string, patch: Partial<PartnerRequest>): void {
    const request = this.activeRequest;
    if (!request) return;

    this.partnerIntegration.updateRequest(request.id, patch, label);
    this.load();
  }

  downloadProfile(): void {
    if (!this.partner) return;
    const hasCredentials = this.requests.some(request => request.testCredentials?.trim());
    if (!hasCredentials) {
      this.pdf.downloadPartnerProfile(this.partner, this.requests, this.events);
      return;
    }

    this.modal.confirm({
      nzTitle: 'Include test credentials?',
      nzContent: 'This partner has recorded test credentials. Hide them unless this PDF really needs to include sensitive details.',
      nzOkText: 'Include credentials',
      nzCancelText: 'Hide credentials',
      nzOnOk: () => this.pdf.downloadPartnerProfile(this.partner!, this.requests, this.events, {includeCredentials: true}),
      nzOnCancel: () => this.pdf.downloadPartnerProfile(this.partner!, this.requests, this.events, {includeCredentials: false})
    });
  }
}
