import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {
  Partner,
  PartnerEnvironment,
  PartnerPrivateEndpoint,
  PartnerRequest,
  RequestFormData,
  TimelineEvent,
  WorkflowStatus
} from '@shared/models/partner-integration';
import {NzModalService} from 'ng-zorro-antd/modal';

interface WorkflowAction {
  label: string;
  description: string;
  patch: Partial<PartnerRequest>;
  tone?: 'primary' | 'default' | 'danger';
  requiresCredentialsText?: boolean;
  requiresTechnicalData?: boolean;
}

interface TechnicalDraft {
  publicPeerIpsText: string;
  privateEndpoints: PartnerPrivateEndpoint[];
  serviceApi: string;
  environment: PartnerEnvironment;
  technicalContact: string;
  authMethod: string;
  ownCloudFolderUrl: string;
  formNotes: string;
}

@Component({
  selector: 'app-request-detail',
  standalone: false,
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.scss']
})
export class RequestDetailComponent implements OnInit {
  request: PartnerRequest | undefined;
  partner: Partner | undefined;
  events: TimelineEvent[] = [];
  isCredentialsEditorOpen = false;
  isTechnicalEditorOpen = false;
  credentialsDraft = '';
  technicalDraft: TechnicalDraft = this.emptyTechnicalDraft();
  importNotice = '';
  readonly flow: WorkflowStatus[] = [
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
    'READY_UAT',
    'UAT_IN_PROGRESS',
    'READY_HANDOVER',
    'CLOSED'
  ];

  constructor(
    public partnerIntegration: PartnerIntegrationService,
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
    this.request = this.partnerIntegration.getRequest(id);
    this.partner = this.request ? this.partnerIntegration.getPartner(this.request.partnerId) : undefined;
    this.events = this.request ? this.partnerIntegration.getEvents(this.request.id) : [];
  }

  get formData(): RequestFormData | undefined {
    if (!this.request || !this.partner) return undefined;
    return this.partnerIntegration.getRequestFormData(this.request, this.partner);
  }

  publicPeersLabel(): string {
    const formData = this.formData;
    return formData?.publicPeerIps?.length ? formData.publicPeerIps.join(', ') : formData?.publicIp || '-';
  }

  privateEndpointsLabel(): string {
    const endpoints = this.formData?.privateEndpoints || [];
    if (endpoints.length) {
      return endpoints.map(endpoint => `${endpoint.environment}: ${endpoint.ip || '-'}:${endpoint.port || '-'}`).join(' | ');
    }

    return this.formData?.partnerServerIp || '-';
  }

  canValidateForm(): boolean {
    return this.hasTechnicalData(this.formData);
  }

  openTechnicalEditor(): void {
    const formData = this.formData;
    this.technicalDraft = {
      publicPeerIpsText: formData?.publicPeerIps?.length ? formData.publicPeerIps.join('\n') : formData?.publicIp || '',
      privateEndpoints: formData?.privateEndpoints?.length
        ? formData.privateEndpoints.map(endpoint => ({...endpoint}))
        : [{environment: formData?.environment || 'UAT+PRD', ip: formData?.partnerServerIp || '', port: formData?.uatPort || formData?.prdPort || ''}],
      serviceApi: formData?.serviceApi || '',
      environment: formData?.environment || 'UAT+PRD',
      technicalContact: formData?.technicalContact || '',
      authMethod: formData?.authMethod || '',
      ownCloudFolderUrl: formData?.ownCloudFolderUrl || '',
      formNotes: formData?.formNotes || ''
    };
    this.isTechnicalEditorOpen = true;
  }

  cancelTechnicalEditor(): void {
    this.isTechnicalEditorOpen = false;
    this.technicalDraft = this.emptyTechnicalDraft();
  }

  addPrivateEndpoint(): void {
    this.technicalDraft.privateEndpoints.push({environment: 'UAT+PRD', ip: '', port: ''});
  }

  removePrivateEndpoint(index: number): void {
    if (this.technicalDraft.privateEndpoints.length === 1) {
      this.technicalDraft.privateEndpoints[0] = {environment: 'UAT+PRD', ip: '', port: ''};
      return;
    }
    this.technicalDraft.privateEndpoints.splice(index, 1);
  }

  saveTechnicalData(): void {
    if (!this.request || !this.partner) return;
    const publicPeerIps = this.splitValues(this.technicalDraft.publicPeerIpsText);
    const privateEndpoints = this.technicalDraft.privateEndpoints
      .map(endpoint => ({
        environment: endpoint.environment,
        ip: endpoint.ip.trim(),
        port: endpoint.port.trim()
      }))
      .filter(endpoint => endpoint.ip || endpoint.port);
    const formData: RequestFormData = {
      ...this.partnerIntegration.getRequestFormData(this.request, this.partner),
      serviceApi: this.technicalDraft.serviceApi.trim(),
      environment: this.technicalDraft.environment,
      technicalContact: this.technicalDraft.technicalContact.trim(),
      publicIp: publicPeerIps[0] || '',
      publicPeerIps,
      partnerServerIp: privateEndpoints.find(endpoint => endpoint.ip)?.ip || '',
      uatPort: privateEndpoints.find(endpoint => endpoint.environment !== 'PRD' && endpoint.port)?.port || '',
      prdPort: privateEndpoints.find(endpoint => endpoint.environment !== 'UAT' && endpoint.port)?.port || '',
      privateEndpoints,
      authMethod: this.technicalDraft.authMethod.trim(),
      ownCloudFolderUrl: this.technicalDraft.ownCloudFolderUrl.trim(),
      formNotes: this.technicalDraft.formNotes.trim()
    };

    this.partnerIntegration.updateRequest(this.request.id, {
      formData,
      formReceived: true,
      formValidated: this.hasTechnicalData(formData) ? this.request.formValidated : false
    }, 'VPN Integration Form Data Updated Manually');
    this.importNotice = 'Manual technical data saved on this request.';
    this.isTechnicalEditorOpen = false;
    this.load();
  }

  async importRequestForm(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.request || !this.partner) return;

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
      this.partnerIntegration.updateRequest(this.request.id, {
        formData,
        formSent: true,
        formReceived: true,
        formValidated: this.hasTechnicalData(formData)
      }, this.hasTechnicalData(formData) ? 'VPN Integration Form Imported And Validated' : 'VPN Integration Form Data Updated');
      this.importNotice = `Imported ${file.name}: request form data updated.`;
      this.load();
    } catch (error) {
      console.error('VPN integration form import failed', error);
      this.importNotice = 'Could not import this Excel form. Please check if the file is the VPN integration form.';
    } finally {
      input.value = '';
    }
  }

  confirmAction(label: string, patch: Partial<PartnerRequest>): void {
    if (!this.request) return;
    if (patch.formValidated && !this.canValidateForm()) {
      this.modal.warning({
        nzTitle: 'Technical data required',
        nzContent: 'Fill the public peer and private IP endpoints manually, or import the VPN form, before validating this request.'
      });
      return;
    }

    this.modal.confirm({
      nzTitle: 'Confirm workflow update',
      nzContent: `This will register "${label}" for ${this.partner?.name || 'this partner'} and may move the request from ${this.partnerIntegration.statusLabel(this.request.currentStatus)} to the next status.`,
      nzOkText: 'Confirm update',
      nzCancelText: 'Cancel',
      nzOnOk: () => this.applyAction(label, patch)
    });
  }

  get nextActions(): WorkflowAction[] {
    if (!this.request) return [];

    const map: Partial<Record<WorkflowStatus, WorkflowAction[]>> = {
      NEW: [{
        label: 'Send Form & API Spec',
        description: 'Moves the request to Waiting Form.',
        patch: {formSent: true},
        tone: 'primary'
      }],
      WAITING_FORM: [{
        label: 'Form Received',
        description: 'Moves the request to Form Validation.',
        patch: {formReceived: true},
        tone: 'primary'
      }],
      FORM_VALIDATION: [{
        label: 'Form Validated',
        description: this.canValidateForm()
          ? 'Moves the request to Ready Statement.'
          : 'Import the VPN form or fill peer/endpoints manually before validation.',
        patch: {formValidated: true},
        tone: 'primary',
        requiresTechnicalData: true
      }],
      READY_STATEMENT: [{
        label: 'Statement Created',
        description: 'Makes the request ready for implementation submission.',
        patch: {statementCreated: true},
        tone: 'primary'
      }],
      READY_IMPLEMENTATION: [{
        label: 'Send to vOffice',
        description: 'Moves the request to Waiting Signatures.',
        patch: {statementSent: true},
        tone: 'primary'
      }],
      WAITING_SIGNATURES: [{
        label: 'Approval Complete',
        description: 'Confirms approvals/signatures and submits to IP Core + IT.',
        patch: {signaturesComplete: true, ipCoreStatus: 'SUBMITTED', itStatus: 'SUBMITTED'},
        tone: 'primary'
      }],
      IMPLEMENTATION: this.implementationActions(),
      READY_CONNECTIVITY: [{
        label: 'Start Connectivity Test',
        description: 'Starts the connectivity validation. VPN must be confirmed before environment tests are passed.',
        patch: {vpnStatus: 'IN_PROGRESS', connectivityUat: 'NOT_TESTED', connectivityPrd: 'NOT_TESTED'},
        tone: 'primary'
      }],
      CONNECTIVITY_TEST: this.connectivityActions(),
      READY_UAT: [{
        label: 'Provide Test Credentials',
        description: 'Paste the credentials or test instructions given to this partner.',
        patch: {},
        tone: 'primary',
        requiresCredentialsText: true
      }],
      UAT_IN_PROGRESS: [{
        label: 'UAT PASS',
        description: 'Moves the request to Ready Handover.',
        patch: {uatStatus: 'PASS'},
        tone: 'primary'
      }],
      READY_HANDOVER: [{
        label: 'Handover Complete',
        description: 'Closes the request.',
        patch: {handoverComplete: true},
        tone: 'primary'
      }]
    };

    return map[this.request.currentStatus] || [];
  }

  get exceptionActions(): WorkflowAction[] {
    if (!this.request || this.request.currentStatus === 'CLOSED' || this.request.currentStatus === 'BLOCKED') return [];

    return [
      {
        label: 'Register Issue',
        description: 'Moves the request to Troubleshooting.',
        patch: {connectivityUat: 'FAIL', blocker: 'Needs investigation'},
        tone: 'danger'
      },
      {
        label: 'Block Request',
        description: 'Pauses this request with a mandatory blocker reason. Use this when the active request cannot continue.',
        patch: {},
        tone: 'danger'
      }
    ];
  }

  private implementationActions(): WorkflowAction[] {
    if (!this.request) return [];

    const actions: WorkflowAction[] = [];

    if (this.request.ipCoreStatus !== 'DONE') {
      actions.push({
        label: 'IP Core Done',
        description: this.request.itStatus === 'DONE'
          ? 'IT is already done. This will complete implementation and move to Ready Connectivity.'
          : 'Registers IP Core completion. The request stays in Implementation until IT is also done.',
        patch: {ipCoreStatus: 'DONE'},
        tone: 'primary'
      });
    }

    if (this.request.itStatus !== 'DONE') {
      actions.push({
        label: 'IT Done',
        description: this.request.ipCoreStatus === 'DONE'
          ? 'IP Core is already done. This will complete implementation and move to Ready Connectivity.'
          : 'Registers IT/firewall/routes completion. The request stays in Implementation until IP Core is also done.',
        patch: {itStatus: 'DONE'},
        tone: 'primary'
      });
    }

    return actions;
  }

  private connectivityActions(): WorkflowAction[] {
    if (!this.request) return [];

    const actions: WorkflowAction[] = [];

    if (this.request.vpnStatus !== 'UP') {
      actions.push({
        label: 'VPN UP',
        description: 'Confirms the VPN tunnel is up. Environment connectivity can be passed after this.',
        patch: {vpnStatus: 'UP'},
        tone: 'primary'
      });
      return actions;
    }

    if (this.requiresUat() && this.request.connectivityUat !== 'PASS') {
      actions.push({
        label: 'UAT Connectivity PASS',
        description: 'Confirms UAT connectivity for this partner.',
        patch: {connectivityUat: 'PASS'},
        tone: 'primary'
      });
    }

    if (this.requiresPrd() && this.request.connectivityPrd !== 'PASS') {
      actions.push({
        label: 'PRD Connectivity PASS',
        description: 'Confirms PRD connectivity for this partner.',
        patch: {connectivityPrd: 'PASS'},
        tone: 'primary'
      });
    }

    return actions;
  }

  private requiresUat(): boolean {
    return this.formData?.environment !== 'PRD';
  }

  private requiresPrd(): boolean {
    return this.formData?.environment !== 'UAT';
  }

  openCredentialsEditor(): void {
    if (!this.request) return;
    this.credentialsDraft = this.request.testCredentials || '';
    this.isCredentialsEditorOpen = true;
  }

  cancelCredentialsEditor(): void {
    this.isCredentialsEditorOpen = false;
    this.credentialsDraft = '';
  }

  saveCredentials(): void {
    if (!this.request || !this.credentialsDraft.trim()) return;
    this.partnerIntegration.updateRequest(this.request.id, {
      credentialsProvided: true,
      testCredentials: this.credentialsDraft.trim(),
      uatStatus: 'IN_PROGRESS'
    }, 'Test Credentials Provided');
    this.isCredentialsEditorOpen = false;
    this.credentialsDraft = '';
    this.load();
  }

  shouldShowCredentialsPanel(): boolean {
    if (!this.request) return false;
    return this.request.currentStatus === 'READY_UAT'
      || this.request.currentStatus === 'UAT_IN_PROGRESS'
      || this.request.currentStatus === 'READY_HANDOVER'
      || this.request.currentStatus === 'CLOSED'
      || this.request.credentialsProvided
      || !!this.request.testCredentials?.trim();
  }

  get previousAction(): WorkflowAction | null {
    if (!this.request || this.request.currentStatus === 'BLOCKED') return null;

    const map: Partial<Record<WorkflowStatus, WorkflowAction>> = {
      WAITING_FORM: {
        label: 'Return to New',
        description: 'Use only if the form/API spec was not actually sent.',
        patch: {formSent: false}
      },
      FORM_VALIDATION: {
        label: 'Return to Waiting Form',
        description: 'Use if the received form is invalid or incomplete.',
        patch: {formReceived: false, formValidated: false}
      },
      READY_STATEMENT: {
        label: 'Return to Form Validation',
        description: 'Use if validation needs to be reviewed.',
        patch: {formValidated: false, statementCreated: false}
      },
      READY_IMPLEMENTATION: {
        label: 'Return to Ready Statement',
        description: 'Use if the statement is not ready for implementation.',
        patch: {statementCreated: false, statementSent: false}
      },
      WAITING_SIGNATURES: {
        label: 'Return to Ready Implementation',
        description: 'Use if the statement should not be with approvers yet.',
        patch: {statementSent: false, signaturesComplete: false}
      },
      IMPLEMENTATION: {
        label: 'Return to Waiting Signatures',
        description: 'Use if approval/signature completion was registered by mistake.',
        patch: {signaturesComplete: false, ipCoreStatus: 'NOT_SUBMITTED', itStatus: 'NOT_SUBMITTED'}
      },
      READY_CONNECTIVITY: {
        label: 'Return to Implementation',
        description: 'Use if IP Core or IT is not actually complete.',
        patch: {ipCoreStatus: 'SUBMITTED', itStatus: 'SUBMITTED', connectivityUat: 'NOT_TESTED', connectivityPrd: 'NOT_TESTED'}
      },
      CONNECTIVITY_TEST: {
        label: 'Return to Ready Connectivity',
        description: 'Use if connectivity testing was started by mistake.',
        patch: {vpnStatus: 'NOT_STARTED', connectivityUat: 'NOT_TESTED', connectivityPrd: 'NOT_TESTED'}
      },
      READY_UAT: {
        label: 'Return to Connectivity Test',
        description: 'Use if connectivity pass was registered by mistake.',
        patch: {vpnStatus: 'IN_PROGRESS', connectivityUat: 'IN_PROGRESS', connectivityPrd: 'IN_PROGRESS', credentialsProvided: false, uatStatus: 'NOT_STARTED'}
      },
      UAT_IN_PROGRESS: {
        label: 'Return to Ready UAT',
        description: 'Use if credentials were not actually provided.',
        patch: {credentialsProvided: false, uatStatus: 'NOT_STARTED'}
      },
      READY_HANDOVER: {
        label: 'Return to UAT In Progress',
        description: 'Use if UAT approval needs review.',
        patch: {uatStatus: 'IN_PROGRESS', handoverComplete: false}
      },
      CLOSED: {
        label: 'Reopen to Ready Handover',
        description: 'Use if the request was closed by mistake.',
        patch: {handoverComplete: false}
      }
    };

    return map[this.request.currentStatus] || null;
  }

  isPast(status: WorkflowStatus): boolean {
    if (!this.request) return false;
    const currentIndex = this.flow.indexOf(this.request.currentStatus);
    return currentIndex >= 0 && this.flow.indexOf(status) < currentIndex;
  }

  isCurrent(status: WorkflowStatus): boolean {
    return this.request?.currentStatus === status;
  }

  isNext(status: WorkflowStatus): boolean {
    if (!this.request) return false;
    const currentIndex = this.flow.indexOf(this.request.currentStatus);
    return currentIndex >= 0 && this.flow.indexOf(status) === currentIndex + 1;
  }

  confirmPreviousAction(): void {
    const action = this.previousAction;
    if (!action || !this.request) return;

    const reason = window.prompt('Why do you need to move this request backwards?');
    if (!reason?.trim()) {
      return;
    }

    this.modal.confirm({
      nzTitle: 'Confirm backwards movement',
      nzContent: `This will move the request backwards from ${this.partnerIntegration.statusLabel(this.request.currentStatus)}. Reason was requested for control, but it will not be stored in the partner file.`,
      nzOkText: 'Move backwards',
      nzCancelText: 'Cancel',
      nzOnOk: () => this.applyAction(action.label, action.patch)
    });
  }

  blockRequest(): void {
    if (!this.request) return;

    const reason = window.prompt('Why is this request blocked?');
    if (!reason?.trim()) return;

    this.modal.confirm({
      nzTitle: 'Block active request',
      nzContent: `This will pause ${this.request.title || this.partner?.name || 'this request'} until it is unblocked. The blocker reason will be stored in the request history.`,
      nzOkText: 'Block request',
      nzOkDanger: true,
      nzCancelText: 'Cancel',
      nzOnOk: () => {
        this.partnerIntegration.blockRequest(this.request!.id, reason);
        this.load();
      }
    });
  }

  unblockRequest(): void {
    if (!this.request) return;

    const note = window.prompt('Optional unblock note');
    this.modal.confirm({
      nzTitle: 'Unblock request',
      nzContent: `This will reactivate the request and return it to the workflow state calculated from its existing progress.`,
      nzOkText: 'Unblock request',
      nzCancelText: 'Cancel',
      nzOnOk: () => {
        this.partnerIntegration.unblockRequest(this.request!.id, note || '');
        this.load();
      }
    });
  }

  private applyAction(label: string, patch: Partial<PartnerRequest>): void {
    if (!this.request) return;
    this.partnerIntegration.updateRequest(this.request.id, patch, label);
    this.load();
  }

  back(): void {
    this.router.navigate(['/app/integrations']);
  }

  private async readPartnerForm(file: File, companyName: string): Promise<RequestFormData> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), {type: 'array'});
    const vpnRows = this.sheetRows(XLSX, workbook, 'IPSEC VPN Template');
    const rulesRows = this.sheetRows(XLSX, workbook, 'Rules & Policies');
    const publicPeerIps = this.splitValues(this.partnerCell(vpnRows, 'VPN Peer Address'));
    const partnerDomainIp = this.firstIp(this.partnerCell(vpnRows, 'Encryption domain'));
    const privateEndpoints = this.privateEndpointsFromRules(rulesRows, partnerDomainIp);
    const current = this.formData;
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

  private emptyTechnicalDraft(): TechnicalDraft {
    return {
      publicPeerIpsText: '',
      privateEndpoints: [{environment: 'UAT+PRD', ip: '', port: ''}],
      serviceApi: '',
      environment: 'UAT+PRD',
      technicalContact: '',
      authMethod: '',
      ownCloudFolderUrl: '',
      formNotes: ''
    };
  }
}
