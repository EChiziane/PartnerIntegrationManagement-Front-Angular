import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerRequest, TimelineEvent, WorkflowStatus} from '@shared/models/partner-integration';
import {NzModalService} from 'ng-zorro-antd/modal';

interface WorkflowAction {
  label: string;
  description: string;
  patch: Partial<PartnerRequest>;
  tone?: 'primary' | 'default' | 'danger';
  requiresCredentialsText?: boolean;
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
  credentialsDraft = '';
  readonly flow: WorkflowStatus[] = [
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

  confirmAction(label: string, patch: Partial<PartnerRequest>): void {
    if (!this.request) return;

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
        description: 'Moves the request to Ready Statement.',
        patch: {formValidated: true},
        tone: 'primary'
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
    if (!this.request || this.request.currentStatus === 'CLOSED') return [];

    return [{
      label: 'Register Issue',
      description: 'Moves the request to Troubleshooting.',
      patch: {connectivityUat: 'FAIL', blocker: 'Needs investigation'},
      tone: 'danger'
    }];
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
    return this.partner?.environment !== 'PRD';
  }

  private requiresPrd(): boolean {
    return this.partner?.environment !== 'UAT';
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
    if (!this.request) return null;

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

  private applyAction(label: string, patch: Partial<PartnerRequest>): void {
    if (!this.request) return;
    this.partnerIntegration.updateRequest(this.request.id, patch, label);
    this.load();
  }

  back(): void {
    this.router.navigate(['/app/pipeline']);
  }
}
