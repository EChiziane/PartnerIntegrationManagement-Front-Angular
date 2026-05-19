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
  settledPayments = 0;
  totalCommission = 0;

  isDrawerVisible = false;
  isEditMode = false;
  selectedPaymentId: string | null = null;
  drawerWidth: string | number = 820;
  drawerPlacement: 'right' | 'bottom' = 'right';

  paymentForm = new FormGroup({
    carLoadId: new FormControl<string | null>(null),
    invoiceId: new FormControl<string | null>(null),
    customerAmount: new FormControl(0, [Validators.required, Validators.min(0)]),
    driverAmount: new FormControl(0, [Validators.required, Validators.min(0)]),
    companyCommission: new FormControl(0),
    paymentStatus: new FormControl<PaymentStatus>('PENDING', Validators.required),
    paymentScope: new FormControl<PaymentScope>('CARLOAD', Validators.required),
    paymentDate: new FormControl<string | null>(null),
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
    this.pendingPayments = this.payments.filter(payment => payment.paymentStatus === 'PENDING' || payment.paymentStatus === 'PARTIAL').length;
    this.settledPayments = this.payments.filter(payment => payment.paymentStatus === 'SETTLED').length;
    this.totalCommission = this.payments.reduce((sum, payment) => sum + Number(payment.companyCommission || 0), 0);
  }

  search(): void {
    this.applyFilters();
  }

  reset(): void {
    this.searchValue = '';
    this.applyFilters();
  }

  applyFilters(): void {
    const value = this.searchValue.toLowerCase().trim();
    this.filteredPayments = value
      ? this.payments.filter(payment =>
        (payment.carLoadCustomerName || '').toLowerCase().includes(value) ||
        (payment.invoiceCode || '').toLowerCase().includes(value) ||
        (payment.paymentStatus || '').toLowerCase().includes(value) ||
        (payment.paymentScope || '').toLowerCase().includes(value) ||
        (payment.notes || '').toLowerCase().includes(value)
      )
      : [...this.payments];
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
      paymentStatus: 'PENDING',
      paymentScope: 'CARLOAD',
      paymentDate: this.toDatetimeLocalInput(new Date().toISOString()),
      notes: ''
    });
    this.applyScopeRules();
    this.isDrawerVisible = true;
  }

  editPayment(payment: CarloadPayment): void {
    this.isEditMode = true;
    this.selectedPaymentId = payment.id || null;
    this.paymentForm.patchValue({
      carLoadId: payment.carLoadId || null,
      invoiceId: payment.invoiceId || null,
      customerAmount: Number(payment.customerAmount || 0),
      driverAmount: Number(payment.driverAmount || 0),
      companyCommission: Number(payment.companyCommission || 0),
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
    if (status === 'CANCELLED') return 'red';
    return 'orange';
  }

  formatMoney(value: number | null | undefined): string {
    return Number(value || 0).toFixed(2);
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
}
