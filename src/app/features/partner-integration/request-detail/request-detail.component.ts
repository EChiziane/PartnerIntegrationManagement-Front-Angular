import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {
  Partner,
  PartnerConnection,
  PartnerEnvironment,
  PartnerPrivateEndpoint,
  PartnerRequest,
  RequestFormData,
  TimelineEvent,
  WorkflowStatus
} from '@shared/models/partner-integration';
import {NzModalService} from 'ng-zorro-antd/modal';
import {NzMessageService} from 'ng-zorro-antd/message';
import {TranslationService} from '@core/services/translation.service';

interface WorkflowAction {
  label: string;
  description: string;
  patch: Partial<PartnerRequest>;
  tone?: 'primary' | 'default' | 'danger';
  requiresCredentialsText?: boolean;
  requiresTechnicalData?: boolean;
  requiresStatementCreator?: boolean;
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
  isSrEditorOpen = false;
  isStatementCreatorEditorOpen = false;
  isBackReasonModalOpen = false;
  isBlockReasonModalOpen = false;
  isUnblockNoteModalOpen = false;
  credentialsDraft = '';
  srDraft = '';
  statementCreatorDraft = '';
  reasonDraft = '';
  private pendingSrAction: { label: string; patch: Partial<PartnerRequest> } | null = null;
  private pendingBackAction: WorkflowAction | null = null;
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
    'TROUBLESHOOTING',
    'READY_UAT',
    'UAT_IN_PROGRESS',
    'READY_HANDOVER',
    'CLOSED'
  ];

  constructor(
    public partnerIntegration: PartnerIntegrationService,
    private modal: NzModalService,
    private message: NzMessageService,
    private translation: TranslationService,
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

  get connection(): PartnerConnection | undefined {
    return this.request?.connectionId ? this.partnerIntegration.getConnection(this.request.connectionId) : undefined;
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
    this.importNotice = this.t('messages.manualTechnicalSaved');
    this.message.success(this.t('messages.technicalDataSaved'));
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
      this.importNotice = this.t('messages.importedRequest', {file: file.name});
      this.message.success(this.importNotice);
      this.load();
    } catch (error) {
      console.error('VPN integration form import failed', error);
      this.importNotice = this.t('messages.importFailed');
      this.message.error(this.importNotice);
    } finally {
      input.value = '';
    }
  }

  confirmAction(label: string, patch: Partial<PartnerRequest>): void {
    if (!this.request) return;
    if (patch.formValidated && !this.canValidateForm()) {
      this.modal.warning({
        nzTitle: this.t('modal.technicalRequiredTitle'),
        nzContent: this.t('modal.technicalRequiredContent')
      });
      return;
    }
    if (this.needsSrCodeBeforeSubmit(this.request, patch)) {
      this.pendingSrAction = {label, patch};
      this.openSrEditor();
      return;
    }

    this.modal.confirm({
      nzTitle: this.t('modal.confirmWorkflowTitle'),
      nzContent: this.t('modal.confirmWorkflowContent', {
        label,
        partner: this.partner?.name || this.t('fields.company'),
        status: this.partnerIntegration.statusLabel(this.request.currentStatus)
      }),
      nzOkText: this.t('modal.confirmUpdate'),
      nzCancelText: this.t('common.actions.cancel'),
      nzOnOk: () => this.applyAction(label, patch)
    });
  }

  handleNextAction(action: WorkflowAction): void {
    if (action.requiresCredentialsText) {
      this.openCredentialsEditor();
      return;
    }
    if (action.requiresStatementCreator) {
      this.openStatementCreatorEditor();
      return;
    }

    this.confirmAction(action.label, action.patch);
  }

  get nextActions(): WorkflowAction[] {
    if (!this.request) return [];

    const map: Partial<Record<WorkflowStatus, WorkflowAction[]>> = {
      NEW: [{
        label: this.t('request.actions.sendFormApiSpec'),
        description: this.t('request.actions.sendFormApiSpecDescription'),
        patch: {formSent: true},
        tone: 'primary'
      }],
      WAITING_FORM: [{
        label: this.t('request.actions.formReceived'),
        description: this.t('request.actions.formReceivedDescription'),
        patch: {formReceived: true},
        tone: 'primary'
      }],
      FORM_VALIDATION: [{
        label: this.t('request.actions.formValidated'),
        description: this.canValidateForm()
          ? this.t('request.actions.formValidatedDescription')
          : this.t('request.actions.formNeedsDataDescription'),
        patch: {formValidated: true},
        tone: 'primary',
        requiresTechnicalData: true
      }],
      READY_STATEMENT: [{
        label: this.t('request.actions.statementCreated'),
        description: this.t('request.actions.statementCreatedDescription'),
        patch: {statementCreated: true},
        tone: 'primary',
        requiresStatementCreator: true
      }],
      READY_IMPLEMENTATION: [{
        label: this.t('request.actions.sendToVoffice'),
        description: this.t('request.actions.sendToVofficeDescription'),
        patch: {statementSent: true},
        tone: 'primary'
      }],
      WAITING_SIGNATURES: [{
        label: this.t('request.actions.approvalComplete'),
        description: this.t('request.actions.approvalCompleteDescription'),
        patch: {signaturesComplete: true, ipCoreStatus: 'SUBMITTED', itStatus: 'SUBMITTED'},
        tone: 'primary'
      }],
      IMPLEMENTATION: this.implementationActions(),
      READY_CONNECTIVITY: [{
        label: this.t('request.actions.startConnectivity'),
        description: this.t('request.actions.startConnectivityDescription'),
        patch: {vpnStatus: 'IN_PROGRESS', connectivityUat: 'NOT_TESTED', connectivityPrd: 'NOT_TESTED'},
        tone: 'primary'
      }],
      CONNECTIVITY_TEST: this.connectivityActions(),
      TROUBLESHOOTING: this.troubleshootingActions(),
      READY_UAT: [{
        label: this.t('request.actions.provideCredentials'),
        description: this.t('request.actions.provideCredentialsDescription'),
        patch: {},
        tone: 'primary',
        requiresCredentialsText: true
      }],
      UAT_IN_PROGRESS: [{
        label: this.t('request.actions.uatPass'),
        description: this.t('request.actions.uatPassDescription'),
        patch: {uatStatus: 'PASS'},
        tone: 'primary'
      }],
      READY_HANDOVER: [{
        label: this.t('request.actions.handoverComplete'),
        description: this.t('request.actions.handoverCompleteDescription'),
        patch: {handoverComplete: true},
        tone: 'primary'
      }]
    };

    return map[this.request.currentStatus] || [];
  }

  get exceptionActions(): WorkflowAction[] {
    if (!this.request || this.request.currentStatus === 'CLOSED' || this.request.currentStatus === 'BLOCKED') return [];

    const actions: WorkflowAction[] = [];

    if (this.request.currentStatus !== 'TROUBLESHOOTING') {
      actions.push({
        label: this.t('request.actions.registerIssue'),
        description: this.t('request.actions.registerIssueDescription'),
        patch: {connectivityUat: 'FAIL', blocker: 'Needs investigation'},
        tone: 'danger'
      });
    }

    actions.push({
      label: this.t('request.actions.blockRequest'),
      description: this.t('request.actions.blockRequestDescription'),
      patch: {},
      tone: 'danger'
    });

    return actions;
  }

  isBlockAction(action: WorkflowAction): boolean {
    return action.label === this.t('request.actions.blockRequest');
  }

  private implementationActions(): WorkflowAction[] {
    if (!this.request) return [];

    const actions: WorkflowAction[] = [];

    if (this.request.ipCoreStatus !== 'DONE') {
      actions.push({
        label: this.t('request.actions.ipCoreDone'),
        description: this.request.itStatus === 'DONE'
          ? this.t('request.actions.ipCoreDoneItAlready')
          : this.t('request.actions.ipCoreDoneDescription'),
        patch: {ipCoreStatus: 'DONE'},
        tone: 'primary'
      });
    }

    if (this.request.itStatus !== 'DONE') {
      actions.push({
        label: this.t('request.actions.itDone'),
        description: this.request.ipCoreStatus === 'DONE'
          ? this.t('request.actions.itDoneIpAlready')
          : this.t('request.actions.itDoneDescription'),
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
        label: this.t('request.actions.vpnUp'),
        description: this.t('request.actions.vpnUpDescription'),
        patch: {vpnStatus: 'UP'},
        tone: 'primary'
      });
      return actions;
    }

    if (this.requiresUat() && this.request.connectivityUat !== 'PASS') {
      actions.push({
        label: this.t('request.actions.uatConnectivityPass'),
        description: this.t('request.actions.uatConnectivityPassDescription'),
        patch: {connectivityUat: 'PASS'},
        tone: 'primary'
      });
    }

    if (this.requiresPrd() && this.request.connectivityPrd !== 'PASS') {
      actions.push({
        label: this.t('request.actions.prdConnectivityPass'),
        description: this.t('request.actions.prdConnectivityPassDescription'),
        patch: {connectivityPrd: 'PASS'},
        tone: 'primary'
      });
    }

    return actions;
  }

  private troubleshootingActions(): WorkflowAction[] {
    if (!this.request) return [];

    const actions: WorkflowAction[] = [];
    const requiresUat = this.requiresUat();
    const requiresPrd = this.requiresPrd();

    if (this.request.vpnStatus === 'DOWN') {
      actions.push({
        label: this.t('request.actions.vpnRestored'),
        description: this.t('request.actions.vpnRestoredDescription'),
        patch: {
          vpnStatus: 'UP',
          connectivityUat: requiresUat && this.request.connectivityUat === 'FAIL' ? 'IN_PROGRESS' : this.request.connectivityUat,
          connectivityPrd: requiresPrd && this.request.connectivityPrd === 'FAIL' ? 'IN_PROGRESS' : this.request.connectivityPrd,
          blocker: ''
        },
        tone: 'primary'
      });
    }

    if (requiresUat && this.request.connectivityUat !== 'PASS') {
      actions.push({
        label: this.t('request.actions.uatConnectivityRetestPass'),
        description: this.t('request.actions.uatConnectivityRetestPassDescription'),
        patch: {
          vpnStatus: 'UP',
          connectivityUat: 'PASS',
          blocker: ''
        },
        tone: 'primary'
      });
    }

    if (requiresPrd && this.request.connectivityPrd !== 'PASS') {
      actions.push({
        label: this.t('request.actions.prdConnectivityRetestPass'),
        description: this.t('request.actions.prdConnectivityRetestPassDescription'),
        patch: {
          vpnStatus: 'UP',
          connectivityPrd: 'PASS',
          blocker: ''
        },
        tone: 'primary'
      });
    }

    actions.push({
      label: this.t('request.actions.returnConnectivityTest'),
      description: this.t('request.actions.returnConnectivityTestDescription'),
      patch: {
        vpnStatus: this.request.vpnStatus === 'DOWN' ? 'IN_PROGRESS' : this.request.vpnStatus,
        connectivityUat: requiresUat && this.request.connectivityUat !== 'PASS' ? 'IN_PROGRESS' : this.request.connectivityUat,
        connectivityPrd: requiresPrd && this.request.connectivityPrd !== 'PASS' ? 'IN_PROGRESS' : this.request.connectivityPrd,
        blocker: ''
      }
    });

    return actions;
  }

  needsTroubleshootingFollowUp(): boolean {
    return this.request?.currentStatus === 'TROUBLESHOOTING'
      && this.request.priority === 'P1'
      && !this.request.followUpDate;
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
    this.message.success(this.t('messages.credentialsSaved'));
    this.isCredentialsEditorOpen = false;
    this.credentialsDraft = '';
    this.load();
  }

  editSrCode(): void {
    if (!this.request) return;
    this.pendingSrAction = null;
    this.openSrEditor();
  }

  openSrEditor(): void {
    this.srDraft = this.request?.srCode || '';
    this.isSrEditorOpen = true;
  }

  cancelSrEditor(): void {
    this.isSrEditorOpen = false;
    this.srDraft = '';
    this.pendingSrAction = null;
  }

  saveSrCode(): void {
    if (!this.request) return;
    const srCode = this.srDraft.trim();
    const pending = this.pendingSrAction;

    this.isSrEditorOpen = false;
    this.srDraft = '';
    this.pendingSrAction = null;

    if (pending) {
      this.applyAction(pending.label, {...pending.patch, srCode});
      return;
    }

    this.partnerIntegration.updateRequest(this.request.id, {
      srCode
    }, srCode ? 'CNOC SR Code Updated' : 'CNOC SR Code Cleared');
    this.message.success(this.t('messages.srCodeSaved'));
    this.load();
  }

  openStatementCreatorEditor(): void {
    this.statementCreatorDraft = this.request?.connectionCreatedBy || '';
    this.isStatementCreatorEditorOpen = true;
  }

  cancelStatementCreatorEditor(): void {
    this.isStatementCreatorEditorOpen = false;
    this.statementCreatorDraft = '';
  }

  saveStatementCreator(): void {
    if (!this.request) return;
    const connectionCreatedBy = this.statementCreatorDraft.trim();
    this.isStatementCreatorEditorOpen = false;
    this.statementCreatorDraft = '';
    this.confirmAction(this.t('request.actions.statementCreated'), {
      statementCreated: true,
      connectionCreatedBy
    });
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
        label: this.t('request.backActions.returnNew'),
        description: this.t('request.backActions.returnNewDescription'),
        patch: {formSent: false}
      },
      FORM_VALIDATION: {
        label: this.t('request.backActions.returnWaitingForm'),
        description: this.t('request.backActions.returnWaitingFormDescription'),
        patch: {formReceived: false, formValidated: false}
      },
      READY_STATEMENT: {
        label: this.t('request.backActions.returnFormValidation'),
        description: this.t('request.backActions.returnFormValidationDescription'),
        patch: {formValidated: false, statementCreated: false}
      },
      READY_IMPLEMENTATION: {
        label: this.t('request.backActions.returnReadyStatement'),
        description: this.t('request.backActions.returnReadyStatementDescription'),
        patch: {statementCreated: false, statementSent: false}
      },
      WAITING_SIGNATURES: {
        label: this.t('request.backActions.returnReadyImplementation'),
        description: this.t('request.backActions.returnReadyImplementationDescription'),
        patch: {statementSent: false, signaturesComplete: false}
      },
      IMPLEMENTATION: {
        label: this.t('request.backActions.returnWaitingSignatures'),
        description: this.t('request.backActions.returnWaitingSignaturesDescription'),
        patch: {signaturesComplete: false, ipCoreStatus: 'NOT_SUBMITTED', itStatus: 'NOT_SUBMITTED'}
      },
      READY_CONNECTIVITY: {
        label: this.t('request.backActions.returnImplementation'),
        description: this.t('request.backActions.returnImplementationDescription'),
        patch: {ipCoreStatus: 'SUBMITTED', itStatus: 'SUBMITTED', connectivityUat: 'NOT_TESTED', connectivityPrd: 'NOT_TESTED'}
      },
      CONNECTIVITY_TEST: {
        label: this.t('request.backActions.returnReadyConnectivity'),
        description: this.t('request.backActions.returnReadyConnectivityDescription'),
        patch: {vpnStatus: 'NOT_STARTED', connectivityUat: 'NOT_TESTED', connectivityPrd: 'NOT_TESTED'}
      },
      READY_UAT: {
        label: this.t('request.backActions.returnConnectivityTest'),
        description: this.t('request.backActions.returnConnectivityTestDescription'),
        patch: {vpnStatus: 'IN_PROGRESS', connectivityUat: 'IN_PROGRESS', connectivityPrd: 'IN_PROGRESS', credentialsProvided: false, uatStatus: 'NOT_STARTED'}
      },
      UAT_IN_PROGRESS: {
        label: this.t('request.backActions.returnReadyUat'),
        description: this.t('request.backActions.returnReadyUatDescription'),
        patch: {credentialsProvided: false, uatStatus: 'NOT_STARTED'}
      },
      READY_HANDOVER: {
        label: this.t('request.backActions.returnUatProgress'),
        description: this.t('request.backActions.returnUatProgressDescription'),
        patch: {uatStatus: 'IN_PROGRESS', handoverComplete: false}
      },
      CLOSED: {
        label: this.t('request.backActions.reopenReadyHandover'),
        description: this.t('request.backActions.reopenReadyHandoverDescription'),
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

    this.pendingBackAction = action;
    this.reasonDraft = '';
    this.isBackReasonModalOpen = true;
  }

  cancelBackReason(): void {
    this.isBackReasonModalOpen = false;
    this.reasonDraft = '';
    this.pendingBackAction = null;
  }

  confirmBackReason(): void {
    const action = this.pendingBackAction;
    if (!action || !this.request || !this.reasonDraft.trim()) return;
    this.isBackReasonModalOpen = false;
    this.modal.confirm({
      nzTitle: this.t('modal.confirmBackTitle'),
      nzContent: this.t('modal.confirmBackContent', {status: this.partnerIntegration.statusLabel(this.request.currentStatus)}),
      nzOkText: this.t('modal.moveBack'),
      nzCancelText: this.t('common.actions.cancel'),
      nzOnOk: () => this.applyAction(action.label, action.patch)
    });
    this.reasonDraft = '';
    this.pendingBackAction = null;
  }

  blockRequest(): void {
    if (!this.request) return;

    this.reasonDraft = '';
    this.isBlockReasonModalOpen = true;
  }

  cancelBlockReason(): void {
    this.isBlockReasonModalOpen = false;
    this.reasonDraft = '';
  }

  confirmBlockReason(): void {
    if (!this.request || !this.reasonDraft.trim()) return;
    const reason = this.reasonDraft.trim();
    this.isBlockReasonModalOpen = false;
    this.modal.confirm({
      nzTitle: this.t('modal.blockTitle'),
      nzContent: this.t('modal.blockContent', {request: this.request.title || this.partner?.name || this.t('request.workflow')}),
      nzOkText: this.t('modal.blockOk'),
      nzOkDanger: true,
      nzCancelText: this.t('common.actions.cancel'),
      nzOnOk: () => {
        this.partnerIntegration.blockRequest(this.request!.id, reason);
        this.message.warning(this.t('messages.requestBlocked'));
        this.load();
      }
    });
    this.reasonDraft = '';
  }

  unblockRequest(): void {
    if (!this.request) return;

    this.reasonDraft = '';
    this.isUnblockNoteModalOpen = true;
  }

  cancelUnblockNote(): void {
    this.isUnblockNoteModalOpen = false;
    this.reasonDraft = '';
  }

  confirmUnblockNote(): void {
    if (!this.request) return;
    const note = this.reasonDraft.trim();
    this.isUnblockNoteModalOpen = false;
    this.modal.confirm({
      nzTitle: this.t('modal.unblockTitle'),
      nzContent: this.t('modal.unblockContent'),
      nzOkText: this.t('modal.unblockOk'),
      nzCancelText: this.t('common.actions.cancel'),
      nzOnOk: () => {
        this.partnerIntegration.unblockRequest(this.request!.id, note || '');
        this.message.success(this.t('messages.requestUnblocked'));
        this.load();
      }
    });
    this.reasonDraft = '';
  }

  private applyAction(label: string, patch: Partial<PartnerRequest>): void {
    if (!this.request) return;
    this.partnerIntegration.updateRequest(this.request.id, patch, label);
    this.message.success(this.t('messages.workflowUpdated'));
    this.load();
  }

  private needsSrCodeBeforeSubmit(request: PartnerRequest, patch: Partial<PartnerRequest>): boolean {
    return patch.signaturesComplete === true && patch.ipCoreStatus === 'SUBMITTED' && !request.srCode?.trim();
  }

  back(): void {
    this.router.navigate(['/app/requests']);
  }

  openConnection(): void {
    if (this.connection) this.router.navigate(['/app/connection', this.connection.id]);
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

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translation.instant(key, params);
  }
}
