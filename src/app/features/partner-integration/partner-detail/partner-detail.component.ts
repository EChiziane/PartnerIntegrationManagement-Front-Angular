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
    const request = this.partnerIntegration.createRequest(this.partner.id, this.requestType);
    this.router.navigate(['/app/request', request.id]);
  }

  startUpdateFlow(): void {
    if (!this.partner) return;
    const request = this.partnerIntegration.createRequest(this.partner.id, 'UPDATE_INTEGRATION');
    this.router.navigate(['/app/request', request.id]);
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

  private applyAction(label: string, patch: Partial<PartnerRequest>): void {
    const request = this.activeRequest;
    if (!request) return;

    this.partnerIntegration.updateRequest(request.id, patch, label);
    this.load();
  }

  downloadProfile(): void {
    if (!this.partner) return;
    this.pdf.downloadPartnerProfile(this.partner, this.requests, this.events);
  }
}
