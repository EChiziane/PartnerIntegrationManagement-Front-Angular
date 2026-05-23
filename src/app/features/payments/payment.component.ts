import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {CarloadPayment, PaymentScope, PaymentStatus} from '@shared/models/carload-payment';
import {CarLoad} from '@shared/models/carload';
import {CarloadInvoice} from '@shared/models/carload-invoice';
import {CarloadPaymentService} from '@core/services/carload-payment.service';
import {CarloadService} from '@core/services/carload.service';
import {CarloadInvoiceService} from '@core/services/carload-invoice.service';
import {TranslationService} from '@core/services/translation.service';
import {ConfirmationDialogService} from '@core/services/confirmation-dialog.service';

type PaymentView = 'RECEIVABLE' | 'DRIVER_PAYABLE' | 'SETTLED' | 'ALL';
type PaymentActionType = 'CUSTOMER' | 'DRIVER';

@Component({
  selector: 'app-payment',
  standalone: false,
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit {
  payments: CarloadPayment[] = [];
  filteredPayments: CarloadPayment[] = [];
  carloads: CarLoad[] = [];
  invoices: CarloadInvoice[] = [];

  isLoading = false;
  isSaving = false;
  searchValue = '';

  totalPayments = 0;
  pendingPayments = 0;
  driverPayablePayments = 0;
  settledPayments = 0;
  totalReceivable = 0;
  totalDriverPayable = 0;
  realizedCommission = 0;
  totalCommission = 0;
  activeView: PaymentView = 'RECEIVABLE';

  isDrawerVisible = false;
  isPaymentActionVisible = false;
  isEditMode = false;
  selectedPaymentId: string | null = null;
  selectedPayment: CarloadPayment | null = null;
  paymentActionType: PaymentActionType = 'CUSTOMER';
  drawerWidth: string | number = 820;
  drawerPlacement: 'right' | 'bottom' = 'right';

  paymentForm = new FormGroup({
    carLoadId: new FormControl<string | null>(null),
    invoiceId: new FormControl<string | null>(null),
    customerAmount: new FormControl(0, [Validators.required, Validators.min(0)]),
    driverAmount: new FormControl(0, [Validators.required, Validators.min(0)]),
    companyCommission: new FormControl(0),
    customerPaidAmount: new FormControl(0, [Validators.min(0)]),
    driverPaidAmount: new FormControl(0, [Validators.min(0)]),
    paymentStatus: new FormControl<PaymentStatus>('PENDING', Validators.required),
    paymentScope: new FormControl<PaymentScope>('CARLOAD', Validators.required),
    paymentDate: new FormControl<string | null>(null),
    notes: new FormControl('')
  });
  paymentActionForm = new FormGroup({
    amount: new FormControl(0, [Validators.required, Validators.min(1)]),
    notes: new FormControl('')
  });

  constructor(
    private paymentService: CarloadPaymentService,
    private carloadService: CarloadService,
    private invoiceService: CarloadInvoiceService,
    private message: NzMessageService,
    private confirmationDialog: ConfirmationDialogService,
    private translationService: TranslationService
  ) {
  }

  ngOnInit(): void {
    this.loadPayments();
    this.loadLookups();
    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());

    this.paymentForm.get('customerAmount')?.valueChanges.subscribe(() => this.calculateCommission());
    this.paymentForm.get('driverAmount')?.valueChanges.subscribe(() => this.calculateCommission());
    this.paymentForm.get('paymentScope')?.valueChanges.subscribe(() => this.applyScopeRules());
  }

  get drawerTitle(): string {
    return this.isEditMode
      ? this.t('payments.drawer.editTitle')
      : this.t('payments.drawer.createTitle');
  }

  updateDrawer(): void {
    if (window.innerWidth <= 768) {
      this.drawerWidth = '100%';
      this.drawerPlacement = 'bottom';
    } else {
      this.drawerWidth = 820;
      this.drawerPlacement = 'right';
    }
  }

  loadPayments(): void {
    this.isLoading = true;
    this.paymentService.getPayments().subscribe({
      next: payments => {
        this.payments = payments || [];
        this.calculateStats();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.message.error('Erro ao carregar pagamentos.');
      }
    });
  }

  loadLookups(): void {
    this.carloadService.getCarLoads().subscribe({
      next: carloads => this.carloads = carloads || [],
      error: () => this.message.error('Erro ao carregar carradas.')
    });

    this.invoiceService.getInvoices().subscribe({
      next: invoices => this.invoices = invoices || [],
      error: () => this.message.error('Erro ao carregar faturas.')
    });
  }

  calculateStats(): void {
    this.totalPayments = this.payments.length;
    this.pendingPayments = this.payments.filter(payment => this.canReceiveCustomerPayment(payment)).length;
    this.driverPayablePayments = this.payments.filter(payment => this.canPayDriver(payment)).length;
    this.settledPayments = this.payments.filter(payment => this.getEffectivePaymentStatus(payment) === 'SETTLED').length;
    this.totalReceivable = this.payments
      .filter(payment => this.canReceiveCustomerPayment(payment))
      .reduce((sum, payment) => sum + this.getCustomerBalance(payment), 0);
    this.totalDriverPayable = this.payments
      .filter(payment => this.canPayDriver(payment))
      .reduce((sum, payment) => sum + this.getDriverBalance(payment), 0);
    this.totalCommission = this.payments
      .filter(payment => payment.paymentStatus !== 'CANCELLED')
      .reduce((sum, payment) => sum + Number(payment.companyCommission || 0), 0);
    this.realizedCommission = this.payments
      .filter(payment => payment.paymentStatus === 'SETTLED')
      .reduce((sum, payment) => sum + Number(payment.companyCommission || 0), 0);
  }

  search(): void {
    this.applyFilters();
  }

  reset(): void {
    this.searchValue = '';
    this.applyFilters();
  }

  setView(view: PaymentView): void {
    this.activeView = view;
    this.applyFilters();
  }

  applyFilters(): void {
    const value = this.searchValue.toLowerCase().trim();
    const scopedPayments = this.payments.filter(payment => this.matchesActiveView(payment));
    this.filteredPayments = value
      ? scopedPayments.filter(payment =>
        (payment.carLoadCustomerName || '').toLowerCase().includes(value) ||
        (payment.invoiceCode || '').toLowerCase().includes(value) ||
        (payment.paymentStatus || '').toLowerCase().includes(value) ||
        (payment.paymentScope || '').toLowerCase().includes(value) ||
        (payment.notes || '').toLowerCase().includes(value)
      )
      : [...scopedPayments];
  }

  openDrawer(): void {
    this.isEditMode = false;
    this.selectedPaymentId = null;
    this.paymentForm.reset({
      carLoadId: null,
      invoiceId: null,
      customerAmount: 0,
      driverAmount: 0,
      companyCommission: 0,
      customerPaidAmount: 0,
      driverPaidAmount: 0,
      paymentStatus: 'PENDING',
      paymentScope: 'CARLOAD',
      paymentDate: this.toDatetimeLocalInput(new Date().toISOString()),
      notes: ''
    });
    this.applyScopeRules();
    this.isDrawerVisible = true;
  }

  editPayment(payment: CarloadPayment): void {
    this.isEditMode = !!payment.id;
    this.selectedPaymentId = payment.id || null;
    this.paymentForm.patchValue({
      carLoadId: payment.carLoadId || null,
      invoiceId: payment.invoiceId || null,
      customerAmount: Number(payment.customerAmount || 0),
      driverAmount: Number(payment.driverAmount || 0),
      companyCommission: Number(payment.companyCommission || 0),
      customerPaidAmount: Number(payment.customerPaidAmount || 0),
      driverPaidAmount: Number(payment.driverPaidAmount || 0),
      paymentStatus: payment.paymentStatus || 'PENDING',
      paymentScope: payment.paymentScope || 'CARLOAD',
      paymentDate: this.toDatetimeLocalInput(payment.paymentDate || null),
      notes: payment.notes || ''
    });
    this.applyScopeRules();
    this.isDrawerVisible = true;
  }

  closeDrawer(): void {
    if (this.isSaving) return;
    this.isDrawerVisible = false;
    this.selectedPaymentId = null;
    this.paymentForm.reset();
  }

  savePayment(): void {
    this.applyScopeRules();
    if (this.paymentForm.invalid) {
      this.message.warning('Preencha os campos obrigatorios.');
      return;
    }

    this.isSaving = true;
    const raw = this.paymentForm.value;
    const payload: Partial<CarloadPayment> = {
      carLoadId: raw.carLoadId || null,
      invoiceId: raw.invoiceId || null,
      paymentDate: this.normalizeDateTimeLocal(raw.paymentDate),
      companyCommission: Number(raw.companyCommission || 0),
      customerAmount: Number(raw.customerAmount || 0),
      driverAmount: Number(raw.driverAmount || 0),
      customerPaidAmount: Number(this.paymentForm.value.customerPaidAmount || 0),
      driverPaidAmount: Number(this.paymentForm.value.driverPaidAmount || 0),
      paymentStatus: raw.paymentStatus || 'PENDING',
      paymentScope: raw.paymentScope || 'CARLOAD',
      notes: raw.notes || ''
    };

    const request$ = this.isEditMode && this.selectedPaymentId
      ? this.paymentService.updatePayment(this.selectedPaymentId, payload)
      : this.paymentService.addPayment(payload);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.loadPayments();
        this.closeDrawer();
        this.message.success(this.isEditMode ? 'Pagamento atualizado com sucesso.' : 'Pagamento criado com sucesso.');
      },
      error: () => {
        this.isSaving = false;
        this.message.error('Erro ao gravar pagamento.');
      }
    });
  }

  deletePayment(payment: CarloadPayment): void {
    if (!payment.id) return;

    this.confirmationDialog.confirmDelete({
      entity: this.t('common.entities.payment'),
      name: payment.carLoadCustomerName || payment.invoiceCode || payment.id,
      onOk: () => this.paymentService.deletePayment(payment.id!).subscribe({
        next: () => {
          this.loadPayments();
          this.message.success(this.t('payments.messages.deleted'));
        },
        error: () => this.message.error(this.t('payments.messages.deleteError'))
      })
    });
  }

  onCarloadChange(carloadId: string | null): void {
    const carload = this.carloads.find(item => item.id === carloadId);
    if (!carload) return;

    this.paymentForm.patchValue({
      customerAmount: Number(carload.customerPrice ?? carload.totalEarnings ?? 0),
      driverAmount: Number(carload.driverAmount ?? carload.totalSpent ?? 0)
    });
    this.calculateCommission();
  }

  calculateCommission(): void {
    const customerAmount = Number(this.paymentForm.get('customerAmount')?.value || 0);
    const driverAmount = Number(this.paymentForm.get('driverAmount')?.value || 0);
    this.paymentForm.patchValue({companyCommission: customerAmount - driverAmount}, {emitEvent: false});
  }

  applyScopeRules(): void {
    const scope = this.paymentForm.get('paymentScope')?.value || 'CARLOAD';
    const carloadCtrl = this.paymentForm.get('carLoadId')!;
    const invoiceCtrl = this.paymentForm.get('invoiceId')!;

    carloadCtrl.clearValidators();
    invoiceCtrl.clearValidators();

    if (scope === 'CARLOAD' || scope === 'BOTH') {
      carloadCtrl.setValidators([Validators.required]);
    }

    if (scope === 'INVOICE' || scope === 'BOTH') {
      invoiceCtrl.setValidators([Validators.required]);
    }

    carloadCtrl.updateValueAndValidity({emitEvent: false});
    invoiceCtrl.updateValueAndValidity({emitEvent: false});
  }

  getStatusColor(status: PaymentStatus): string {
    if (status === 'SETTLED') return 'green';
    if (status === 'PARTIAL') return 'blue';
    if (status === 'CLIENT_PAID') return 'cyan';
    if (status === 'DRIVER_PENDING') return 'purple';
    if (status === 'CANCELLED') return 'red';
    return 'orange';
  }

  getStatusLabel(status: PaymentStatus): string {
    const labels: Record<PaymentStatus, string> = {
      PENDING: 'A receber',
      PARTIAL: 'Parcial',
      CLIENT_PAID: 'Cliente pagou',
      DRIVER_PENDING: 'Motorista por pagar',
      SETTLED: 'Fechado',
      CANCELLED: 'Cancelado'
    };

    return labels[status] || status;
  }

  getPaymentStatusColor(payment: CarloadPayment): string {
    return this.getStatusColor(this.getEffectivePaymentStatus(payment));
  }

  getPaymentStatusLabel(payment: CarloadPayment): string {
    return this.getStatusLabel(this.getEffectivePaymentStatus(payment));
  }

  getEffectivePaymentStatus(payment: CarloadPayment): PaymentStatus {
    if (payment.paymentStatus === 'CANCELLED' || this.isCancelledOrFailed(payment)) {
      return 'CANCELLED';
    }

    const customerBalance = this.getCustomerBalance(payment);
    const customerPaidAmount = Number(payment.customerPaidAmount || 0);

    if (customerBalance > 0) {
      return customerPaidAmount > 0 ? 'PARTIAL' : 'PENDING';
    }

    if (this.getDriverBalance(payment) > 0) {
      return this.isDelivered(payment) ? 'DRIVER_PENDING' : 'CLIENT_PAID';
    }

    return 'SETTLED';
  }

  formatMoney(value: number | null | undefined): string {
    return Number(value || 0).toFixed(2);
  }

  getCustomerBalance(payment: CarloadPayment): number {
    return Number(payment.customerBalance ?? (Number(payment.customerAmount || 0) - Number(payment.customerPaidAmount || 0)));
  }

  getDriverBalance(payment: CarloadPayment): number {
    return Number(payment.driverBalance ?? (Number(payment.driverAmount || 0) - Number(payment.driverPaidAmount || 0)));
  }

  getActionTotalAmount(): number {
    if (!this.selectedPayment) return 0;
    return this.paymentActionType === 'CUSTOMER'
      ? Number(this.selectedPayment.customerAmount || 0)
      : Number(this.selectedPayment.driverAmount || 0);
  }

  getActionPaidAmount(): number {
    if (!this.selectedPayment) return 0;
    return this.paymentActionType === 'CUSTOMER'
      ? Number(this.selectedPayment.customerPaidAmount || 0)
      : Number(this.selectedPayment.driverPaidAmount || 0);
  }

  getActionBalance(): number {
    if (!this.selectedPayment) return 0;
    return this.paymentActionType === 'CUSTOMER'
      ? this.getCustomerBalance(this.selectedPayment)
      : this.getDriverBalance(this.selectedPayment);
  }

  getActionInsertedAmount(): number {
    return Number(this.paymentActionForm.value.amount || 0);
  }

  getActionProjectedPaid(): number {
    return Math.min(this.getActionPaidAmount() + this.getActionInsertedAmount(), this.getActionTotalAmount());
  }

  getActionProjectedBalance(): number {
    return Math.max(this.getActionBalance() - this.getActionInsertedAmount(), 0);
  }

  getActionAmountLabel(): string {
    return this.paymentActionType === 'CUSTOMER'
      ? 'Valor inserido manualmente'
      : 'Valor pago agora';
  }

  getActionTotalLabel(): string {
    return this.paymentActionType === 'CUSTOMER'
      ? 'Valor da carrada'
      : 'Valor do motorista';
  }

  willCloseAction(): boolean {
    return this.getActionProjectedBalance() <= 0;
  }

  isPendingSuggestion(payment: CarloadPayment): boolean {
    return !payment.id && payment.paymentStatus === 'PENDING';
  }

  getPaymentActionLabel(payment: CarloadPayment): string {
    return this.isPendingSuggestion(payment) ? 'Regularizar' : 'Editar';
  }

  canReceiveCustomerPayment(payment: CarloadPayment): boolean {
    return this.getCustomerBalance(payment) > 0
      && !this.isCancelledOrFailed(payment);
  }

  canPayDriver(payment: CarloadPayment): boolean {
    return this.getCustomerBalance(payment) <= 0
      && this.isDelivered(payment)
      && this.getDriverBalance(payment) > 0;
  }

  markClientPaid(payment: CarloadPayment): void {
    this.openPaymentAction(payment, 'CUSTOMER');
  }

  markSettled(payment: CarloadPayment): void {
    this.openPaymentAction(payment, 'DRIVER');
  }

  openPaymentAction(payment: CarloadPayment, type: PaymentActionType): void {
    this.selectedPayment = payment;
    this.paymentActionType = type;
    this.paymentActionForm.reset({
      amount: type === 'CUSTOMER' ? this.getCustomerBalance(payment) : this.getDriverBalance(payment),
      notes: ''
    });
    this.isPaymentActionVisible = true;
  }

  closePaymentAction(): void {
    if (this.isSaving) return;
    this.isPaymentActionVisible = false;
    this.selectedPayment = null;
    this.paymentActionForm.reset();
  }

  savePaymentAction(): void {
    if (!this.selectedPayment || this.paymentActionForm.invalid) {
      this.message.warning('Informe o valor.');
      return;
    }

    const amount = Number(this.paymentActionForm.value.amount || 0);
    const notes = this.paymentActionForm.value.notes || '';
    const currentNotes = this.selectedPayment.notes || '';
    const actionNote = this.paymentActionType === 'CUSTOMER'
      ? `Recebido do cliente: ${this.formatMoney(amount)} Mts`
      : `Pago ao motorista: ${this.formatMoney(amount)} Mts`;

    const payload = this.buildPaymentPayload(this.selectedPayment, {
      customerPaidAmount: this.paymentActionType === 'CUSTOMER'
        ? Number(this.selectedPayment.customerPaidAmount || 0) + amount
        : Number(this.selectedPayment.customerPaidAmount || 0),
      driverPaidAmount: this.paymentActionType === 'DRIVER'
        ? Number(this.selectedPayment.driverPaidAmount || 0) + amount
        : Number(this.selectedPayment.driverPaidAmount || 0),
      notes: [currentNotes, actionNote, notes].filter(Boolean).join('\n')
    });

    this.persistPayment(this.selectedPayment, payload, this.paymentActionType === 'CUSTOMER'
      ? 'Pagamento do cliente registado.'
      : 'Pagamento ao motorista registado.');
  }

  onBack(): void {
    window.history.back();
  }

  private normalizeDateTimeLocal(v: string | null | undefined): string | null {
    if (!v) return null;
    if (!v.includes('T')) return `${v}T00:00:00`;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return `${v}:00`;
    return v;
  }

  private toDatetimeLocalInput(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const cleaned = iso.replace('Z', '').split('+')[0].split('.')[0];
    return cleaned.includes('T') ? cleaned.substring(0, 16) : `${cleaned}T00:00`;
  }

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }

  private matchesActiveView(payment: CarloadPayment): boolean {
    if (this.activeView === 'RECEIVABLE') {
      return this.canReceiveCustomerPayment(payment);
    }

    if (this.activeView === 'DRIVER_PAYABLE') {
      return this.canPayDriver(payment);
    }

    if (this.activeView === 'SETTLED') {
      return this.getEffectivePaymentStatus(payment) === 'SETTLED';
    }

    return true;
  }

  private buildPaymentPayload(payment: CarloadPayment, overrides: Partial<CarloadPayment> = {}): Partial<CarloadPayment> {
    return {
      carLoadId: payment.carLoadId || null,
      invoiceId: payment.invoiceId || null,
      paymentDate: new Date().toISOString().substring(0, 19),
      companyCommission: Number(payment.companyCommission || 0),
      customerAmount: Number(payment.customerAmount || 0),
      driverAmount: Number(payment.driverAmount || 0),
      customerPaidAmount: Number(payment.customerPaidAmount || 0),
      driverPaidAmount: Number(payment.driverPaidAmount || 0),
      paymentStatus: payment.paymentStatus || 'PENDING',
      paymentScope: payment.paymentScope || 'CARLOAD',
      notes: payment.notes || '',
      ...overrides
    };
  }

  private isDelivered(payment: CarloadPayment): boolean {
    const status = (payment.carLoadDeliveryStatus || '').toUpperCase();
    return status === 'DELIVERED' || status === 'ENTREGUE' || status === 'COMPLETED';
  }

  private isCancelledOrFailed(payment: CarloadPayment): boolean {
    const status = (payment.carLoadDeliveryStatus || '').toUpperCase();
    return status === 'CANCELLED' || status === 'FAILED';
  }

  private persistPayment(payment: CarloadPayment, payload: Partial<CarloadPayment>, successMessage: string): void {
    this.isSaving = true;

    const request$ = payment.id
      ? this.paymentService.updatePayment(payment.id, payload)
      : this.paymentService.addPayment(payload);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.closePaymentAction();
        this.loadPayments();
        this.message.success(successMessage);
      },
      error: () => {
        this.isSaving = false;
        this.message.error('Erro ao atualizar estado financeiro.');
      }
    });
  }
}
