import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerConnection, PartnerEnvironment, PartnerPrivateEndpoint, PartnerRequest, RequestFormData, RequestType, TimelineEvent} from '@shared/models/partner-integration';
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
  importNotice = '';

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
    this.requests = this.partnerIntegration.getRequests()
      .filter(request => request.partnerId === id)
      .sort((a, b) => this.requestTimestamp(b) - this.requestTimestamp(a));
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

  get activeFormData(): RequestFormData | undefined {
    const request = this.activeRequest;
    if (!request || !this.partner) return undefined;
    return this.partnerIntegration.getRequestFormData(request, this.partner);
  }

  get connection(): PartnerConnection | undefined {
    return this.partner ? this.partnerIntegration.getPartnerConnection(this.partner.id) : undefined;
  }

  get integrationDrivingRequest(): PartnerRequest | undefined {
    return this.requests.find(request => request.id === this.connection?.lastRequestId)
      || this.activeRequest;
  }

  get openRequestsCount(): number {
    return this.requests.filter(request => request.currentStatus !== 'CLOSED').length;
  }

  publicPeersLabel(partner: Partner): string {
    const formData = this.activeFormData;
    return formData?.publicPeerIps?.length ? formData.publicPeerIps.join(', ') : formData?.publicIp || partner.publicIp || '-';
  }

  privateEndpoints(partner: Partner): Array<{environment: string; ip: string; port: string}> {
    const formData = this.activeFormData;
    if (formData?.privateEndpoints?.length) {
      return formData.privateEndpoints;
    }
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

  canValidateActiveForm(): boolean {
    return this.hasTechnicalData(this.activeFormData);
  }

  requiresUat(): boolean {
    return this.activeFormData?.environment !== 'PRD';
  }

  requiresPrd(): boolean {
    return this.activeFormData?.environment !== 'UAT';
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
        nzContent: 'This institution already has a blocked request. Create a new request only if the blocked work cannot continue.',
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
        nzContent: 'This integration already has a blocked active request. You can unblock it or create a separate update request if this is genuinely new work.',
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

  async importRequestForm(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const request = this.activeRequest;
    if (!file || !request || !this.partner) return;

    try {
      const formData = await this.readPartnerForm(file, this.partner.name);
      this.partnerIntegration.updatePartner(this.partner.id, {
        name: formData.companyName || this.partner.name,
        eMolaAccountOtp: formData.eMolaAccountOtp || this.partner.eMolaAccountOtp || '',
        representativeName: formData.representativeName || this.partner.representativeName || '',
        groupLink: formData.groupLink || this.partner.groupLink || '',
        phone: formData.phone || this.partner.phone,
        email: formData.email || this.partner.email
      });
      this.partnerIntegration.updateRequest(request.id, {
        formData,
        formSent: true,
        formReceived: true,
        formValidated: this.hasTechnicalData(formData)
      }, this.hasTechnicalData(formData) ? 'Request Form Imported And Validated' : 'Request Form Data Updated');
      this.importNotice = `Imported ${file.name}: request form data updated.`;
      this.load();
    } catch (error) {
      console.error('Partner form import failed', error);
      this.importNotice = 'Could not import this Excel form. Please check if the file is the VPN integration form.';
    } finally {
      input.value = '';
    }
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
    if (patch.formValidated && !this.canValidateActiveForm()) {
      this.modal.warning({
        nzTitle: 'Technical data required',
        nzContent: 'Open the request pipeline and import the VPN form or fill the IP data manually before validating.'
      });
      return;
    }

    this.modal.confirm({
      nzTitle: 'Confirm workflow update',
      nzContent: `This will register "${label}" for ${this.partner?.name || 'this institution'} and may move the request from ${this.partnerIntegration.statusLabel(request.currentStatus)} to the next status.`,
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
      nzContent: 'This institution has recorded test credentials. Hide them unless this PDF really needs to include sensitive details.',
      nzOkText: 'Include credentials',
      nzCancelText: 'Hide credentials',
      nzOnOk: () => this.pdf.downloadPartnerProfile(this.partner!, this.requests, this.events, {includeCredentials: true}),
      nzOnCancel: () => this.pdf.downloadPartnerProfile(this.partner!, this.requests, this.events, {includeCredentials: false})
    });
  }

  private async readPartnerForm(file: File, companyName: string): Promise<RequestFormData> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), {type: 'array'});
    const vpnRows = this.sheetRows(XLSX, workbook, 'IPSEC VPN Template');
    const rulesRows = this.sheetRows(XLSX, workbook, 'Rules & Policies');
    const publicPeerIps = this.splitValues(this.partnerCell(vpnRows, 'VPN Peer Address'));
    const partnerDomainIp = this.firstIp(this.partnerCell(vpnRows, 'Encryption domain'));
    const privateEndpoints = this.privateEndpointsFromRules(rulesRows, partnerDomainIp);
    const current = this.activeFormData;
    const institutionEmail = this.partnerCell(vpnRows, 'Email Address');
    const institutionPhone = this.partnerCell(vpnRows, 'Contact Phone Number');

    return {
      companyName: this.partnerCell(vpnRows, 'Company Name') || companyName,
      eMolaAccountOtp: this.partnerCell(vpnRows, 'e-Mola Account (OTP)') || current?.eMolaAccountOtp || this.partner?.eMolaAccountOtp || '',
      representativeName: this.partnerCell(vpnRows, 'Representative Name') || current?.representativeName || this.partner?.representativeName || '',
      groupLink: current?.groupLink || this.partner?.groupLink || '',
      businessOwner: current?.businessOwner || this.partner?.businessOwner || '',
      technicalContact: this.partnerCell(vpnRows, 'Name') || current?.technicalContact || this.partner?.technicalContact || '',
      phone: institutionPhone || this.partnerCell(vpnRows, 'Cell Phone') || current?.phone || this.partner?.phone || '',
      email: institutionEmail || current?.email || this.partner?.email || '',
      serviceApi: current?.serviceApi || this.partner?.serviceApi || '',
      environment: privateEndpoints.length ? this.environmentFromEndpoints(privateEndpoints) : current?.environment || this.partner?.environment || 'UAT+PRD',
      publicIp: publicPeerIps[0] || current?.publicIp || this.partner?.publicIp || '',
      publicPeerIps: publicPeerIps.length ? publicPeerIps : current?.publicPeerIps || this.partner?.publicPeerIps || [],
      partnerServerIp: privateEndpoints.find(endpoint => endpoint.ip)?.ip || current?.partnerServerIp || this.partner?.partnerServerIp || '',
      uatPort: privateEndpoints.find(endpoint => endpoint.environment !== 'PRD' && endpoint.port)?.port || current?.uatPort || this.partner?.uatPort || '',
      prdPort: privateEndpoints.find(endpoint => endpoint.environment !== 'UAT' && endpoint.port)?.port || current?.prdPort || this.partner?.prdPort || '',
      privateEndpoints: privateEndpoints.length ? privateEndpoints : current?.privateEndpoints || this.partner?.privateEndpoints || [],
      authMethod: this.partnerCell(vpnRows, 'Authentication Method') || current?.authMethod || this.partner?.authMethod || '',
      ownCloudFolderUrl: current?.ownCloudFolderUrl || this.partner?.ownCloudFolderUrl || '',
      formNotes: current?.formNotes || this.partner?.formNotes || '',
      importedFileName: file.name,
      importedAt: new Date().toISOString()
    };
  }

  private sheetRows(
    XLSX: typeof import('xlsx'),
    workbook: import('xlsx').WorkBook,
    sheetNamePart: string
  ): string[][] {
    const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes(sheetNamePart.toLowerCase()));
    if (!sheetName) return [];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1, blankrows: false, defval: ''})
      .map(row => (row as unknown[]).map(value => String(value ?? '').trim()));
  }

  private partnerCell(rows: string[][], label: string): string {
    const row = rows.find(item => item[0]?.toLowerCase().replace(/\s+/g, ' ').trim() === label.toLowerCase());
    return this.cleanPlaceholder(row?.[2] || row?.[1] || '', label);
  }

  private privateEndpointsFromRules(rows: string[][], partnerDomainIp: string): PartnerPrivateEndpoint[] {
    const endpoints: PartnerPrivateEndpoint[] = [];

    rows
      .filter(row => /^rule\s+\d+/i.test(row[0] || ''))
      .forEach(row => {
        const sourceIps = this.splitValues(row[1]);
        const destinationIps = this.splitValues(row[3]);
        const ports = [...String(row[5] || '').matchAll(/\d{2,5}/g)].map(match => match[0]);
        const environment = this.environmentFromPurpose(row[7]);
        const endpointIps = partnerDomainIp ? [partnerDomainIp] : (/callback/i.test(row[7]) ? destinationIps : sourceIps);

        endpointIps.forEach(ip => ports.forEach(port => endpoints.push({environment, ip, port})));
      });

    return endpoints.filter((endpoint, index, list) =>
      list.findIndex(item => item.environment === endpoint.environment
        && item.ip === endpoint.ip
        && item.port === endpoint.port) === index
    );
  }

  private environmentFromPurpose(value: string): PartnerEnvironment {
    const normalized = value.toUpperCase();
    if (normalized.includes('UAT') && normalized.includes('PRD')) return 'UAT+PRD';
    if (normalized.includes('PRD')) return 'PRD';
    return 'UAT';
  }

  private environmentFromEndpoints(endpoints: PartnerPrivateEndpoint[]): PartnerEnvironment {
    const environments = new Set(endpoints.map(endpoint => endpoint.environment));
    if (environments.has('UAT+PRD') || (environments.has('UAT') && environments.has('PRD'))) return 'UAT+PRD';
    if (environments.has('PRD')) return 'PRD';
    return 'UAT';
  }

  private splitValues(value: string): string[] {
    return String(value || '')
      .split(/[\n,;]+/)
      .map(item => item.trim().replace(/\/32$/, ''))
      .filter(Boolean);
  }

  private firstIp(value: string): string {
    return this.splitValues(value).find(item => /\d+\.\d+\.\d+\.\d+/.test(item)) || '';
  }

  private cleanPlaceholder(value: string, placeholder: string): string {
    const clean = String(value || '').trim();
    return clean.toLowerCase().replace(/\s+/g, '') === placeholder.toLowerCase().replace(/\s+/g, '') ? '' : clean;
  }

  private hasTechnicalData(formData?: RequestFormData): boolean {
    return !!formData
      && (!!formData.publicIp
        || !!formData.partnerServerIp
        || !!formData.publicPeerIps?.length
        || !!formData.privateEndpoints?.length);
  }

  private requestTimestamp(request: PartnerRequest): number {
    return new Date(request.closeDate || request.stageStartDate || request.openDate || 0).getTime() || 0;
  }
}
