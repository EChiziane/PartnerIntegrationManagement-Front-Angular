import {Component, OnInit} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';

import {CarloadInvoice} from '@shared/models/carload-invoice';
import {CarloadCustomer} from '@shared/models/carload-customer';
import {CarLoad} from '@shared/models/carload';
import {CarloadInvoiceItem} from '@shared/models/carload-invoice-item';

import {CarloadInvoiceService} from '@core/services/carload-invoice.service';
import {CarloadCustomerService} from '@core/services/carload-customer.service';
import {TranslationService} from '@core/services/translation.service';
import {ConfirmationDialogService} from '@core/services/confirmation-dialog.service';
import {DocumentFilenameService} from '@core/services/document-filename.service';
import {COMPANY_PDF_LINES, COMPANY_PROFILE} from '@shared/data/company-profile';
import {ProductPriceService} from '@core/services/product-price.service';

type InvoicePeriodPreset = 'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'CUSTOM';

@Component({
  selector: 'app-invoice',
  standalone: false,
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss'
})
export class InvoiceComponent implements OnInit {
  invoices: CarloadInvoice[] = [];
  allInvoices: CarloadInvoice[] = [];
  dataCustomer: CarloadCustomer[] = [];
  billableCarloads: CarLoad[] = [];
  selectedCarloadIds: string[] = [];
  isLoadingBillableCarloads = false;

  isLoading = false;
  isSaving = false;

  isDrawerVisible = false;
  isPreviewDrawerVisible = false;
  isCopyMode = false;
  selectedInvoice: CarloadInvoice | null = null;

  searchValue = '';
  dateRange: Date[] | null = null;
  selectedCustomerId: string | null = null;
  selectedPeriodPreset: InvoicePeriodPreset = 'ALL';

  totalInvoices = 0;
  totalCustomers = 0;

  drawerWidth: string | number = 1000;
  previewDrawerWidth: string | number = 860;
  drawerPlacement: 'right' | 'bottom' = 'right';

  invoiceForm!: FormGroup;

  itemsOptions: string[] = [
    'M4_AREIA_GROSSA',
    'M4_AREIA_VERMELHA',
    'M4_AREIA_FINA',
    'M4_PEDRA_3_4',
    'M4_PO_DE_PEDRA',
    'M4_PEDRA_ENROCAMENTO',
    'M4_PEDRA_SARRISCA',

    'M7_AREIA_GROSSA',
    'M7_AREIA_VERMELHA',
    'M7_AREIA_FINA',
    'M7_PEDRA_3_4',
    'M7_PO_DE_PEDRA',
    'M7_PEDRA_ENROCAMENTO',
    'M7_PEDRA_SARRISCA',

    'M18_AREIA_GROSSA',
    'M18_AREIA_VERMELHA',
    'M18_AREIA_FINA',
    'M18_PEDRA_3_4',
    'M18_PO_DE_PEDRA',
    'M18_PEDRA_ENROCAMENTO',
    'M18_PEDRA_SARRISCA',

    'M22_AREIA_GROSSA',
    'M22_AREIA_VERMELHA',
    'M22_AREIA_FINA',
    'M22_PEDRA_3_4',
    'M22_PO_DE_PEDRA',
    'M22_PEDRA_ENROCAMENTO',
    'M22_PEDRA_SARRISCA',

    'M24_AREIA_GROSSA',
    'M24_AREIA_VERMELHA',
    'M24_AREIA_FINA',
    'M24_PEDRA_3_4',
    'M24_PO_DE_PEDRA',
    'M24_PEDRA_ENROCAMENTO',
    'M24_PEDRA_SARRISCA'
  ];

  itemLabels: { [key: string]: string } = {
    M4_AREIA_GROSSA: '4m³ Areia Grossa',
    M4_AREIA_VERMELHA: '4m³ Areia Vermelha',
    M4_AREIA_FINA: '4m³ Areia Fina',
    M4_PEDRA_3_4: '4m³ Pedra 3/4',
    M4_PO_DE_PEDRA: '4m³ Pó de Pedra',
    M4_PEDRA_ENROCAMENTO: '4m³ Pedra Enrocamento',
    M4_PEDRA_SARRISCA: '4m³ Pedra Sarrisca',

    M7_AREIA_GROSSA: '7m³ Areia Grossa',
    M7_AREIA_VERMELHA: '7m³ Areia Vermelha',
    M7_AREIA_FINA: '7m³ Areia Fina',
    M7_PEDRA_3_4: '7m³ Pedra 3/4',
    M7_PO_DE_PEDRA: '7m³ Pó de Pedra',
    M7_PEDRA_ENROCAMENTO: '7m³ Pedra Enrocamento',
    M7_PEDRA_SARRISCA: '7m³ Pedra Sarrisca',

    M18_AREIA_GROSSA: '18m³ Areia Grossa',
    M18_AREIA_VERMELHA: '18m³ Areia Vermelha',
    M18_AREIA_FINA: '18m³ Areia Fina',
    M18_PEDRA_3_4: '18m³ Pedra 3/4',
    M18_PO_DE_PEDRA: '18m³ Pó de Pedra',
    M18_PEDRA_ENROCAMENTO: '18m³ Pedra Enrocamento',
    M18_PEDRA_SARRISCA: '18m³ Pedra Sarrisca',

    M22_AREIA_GROSSA: '22m³ Areia Grossa',
    M22_AREIA_VERMELHA: '22m³ Areia Vermelha',
    M22_AREIA_FINA: '22m³ Areia Fina',
    M22_PEDRA_3_4: '22m³ Pedra 3/4',
    M22_PO_DE_PEDRA: '22m³ Pó de Pedra',
    M22_PEDRA_ENROCAMENTO: '22m³ Pedra Enrocamento',
    M22_PEDRA_SARRISCA: '22m³ Pedra Sarrisca',

    M24_AREIA_GROSSA: '24m³ Areia Grossa',
    M24_AREIA_VERMELHA: '24m³ Areia Vermelha',
    M24_AREIA_FINA: '24m³ Areia Fina',
    M24_PEDRA_3_4: '24m³ Pedra 3/4',
    M24_PO_DE_PEDRA: '24m³ Pó de Pedra',
    M24_PEDRA_ENROCAMENTO: '24m³ Pedra Enrocamento',
    M24_PEDRA_SARRISCA: '24m³ Pedra Sarrisca'
  };

  itemsPrices: { [key: string]: number } = {
    M4_AREIA_GROSSA: 6000,
    M4_AREIA_VERMELHA: 3500,
    M4_AREIA_FINA: 5000,
    M4_PEDRA_3_4: 5500,
    M4_PO_DE_PEDRA: 5000,
    M4_PEDRA_ENROCAMENTO: 5500,
    M4_PEDRA_SARRISCA: 25000,

    M7_AREIA_GROSSA: 9000,
    M7_AREIA_VERMELHA: 4500,
    M7_AREIA_FINA: 6500,
    M7_PEDRA_3_4: 8000,
    M7_PO_DE_PEDRA: 7500,
    M7_PEDRA_ENROCAMENTO: 8000,
    M7_PEDRA_SARRISCA: 8000,

    M18_AREIA_GROSSA: 19000,
    M18_AREIA_VERMELHA: 8000,
    M18_AREIA_FINA: 13000,
    M18_PEDRA_3_4: 18000,
    M18_PO_DE_PEDRA: 17000,
    M18_PEDRA_ENROCAMENTO: 18000,
    M18_PEDRA_SARRISCA: 18000,

    M22_AREIA_GROSSA: 20000,
    M22_AREIA_VERMELHA: 9000,
    M22_AREIA_FINA: 15000,
    M22_PEDRA_3_4: 22000,
    M22_PO_DE_PEDRA: 19000,
    M22_PEDRA_ENROCAMENTO: 22000,
    M22_PEDRA_SARRISCA: 22000,

    M24_AREIA_GROSSA: 23000,
    M24_AREIA_VERMELHA: 11000,
    M24_AREIA_FINA: 16000,
    M24_PEDRA_3_4: 25000,
    M24_PO_DE_PEDRA: 22000,
    M24_PEDRA_ENROCAMENTO: 25000,
    M24_PEDRA_SARRISCA: 25000
  };

  constructor(
    private fb: FormBuilder,
    private invoiceService: CarloadInvoiceService,
    private customerService: CarloadCustomerService,
    private message: NzMessageService,
    private confirmationDialog: ConfirmationDialogService,
    private translationService: TranslationService,
    private documentFilename: DocumentFilenameService,
    private productPriceService: ProductPriceService
  ) {
  }

  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  get hasActiveFilters(): boolean {
    return !!this.searchValue.trim() || !!this.selectedCustomerId || !!this.dateRange || this.selectedPeriodPreset !== 'ALL';
  }

  get selectedBillableCarloads(): CarLoad[] {
    const selectedIds = new Set(this.selectedCarloadIds);
    return this.billableCarloads.filter(carload => selectedIds.has(carload.id));
  }

  get drawerTitle(): string {
    return this.isCopyMode
      ? this.t('invoice.drawer.copyTitle')
      : this.t('invoice.drawer.createTitle');
  }

  ngOnInit(): void {
    this.initForm();
    this.loadInvoices();
    this.loadCustomers();
    this.loadProductPrices();

    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());
  }

  updateDrawer(): void {
    if (window.innerWidth <= 768) {
      this.drawerWidth = '100%';
      this.previewDrawerWidth = '100%';
      this.drawerPlacement = 'right';
    } else {
      this.drawerWidth = 1000;
      this.previewDrawerWidth = 860;
      this.drawerPlacement = 'right';
    }
  }

  onBack(): void {
    window.history.back();
  }

  onCustomerChange(value: string | null): void {
    this.selectedCustomerId = value;
    this.applyFilters();
  }

  filterByDateRange(): void {
    this.selectedPeriodPreset = this.dateRange ? 'CUSTOM' : 'ALL';
    this.applyFilters();
  }

  search(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchValue = '';
    this.selectedCustomerId = null;
    this.dateRange = null;
    this.selectedPeriodPreset = 'ALL';
    this.applyFilters();
  }

  setPeriodPreset(preset: InvoicePeriodPreset): void {
    this.selectedPeriodPreset = preset;
    this.dateRange = preset === 'ALL' ? null : this.getPresetRange(preset);
    this.applyFilters();
  }

  openDrawer(): void {
    this.isCopyMode = false;
    this.isDrawerVisible = true;

    this.invoiceForm.reset({
      carloadCustomerId: '',
      taxRate: 0.16,
      subtotal: 0,
      tax: 0,
      total: 0
    });

    this.items.clear();
    this.billableCarloads = [];
    this.selectedCarloadIds = [];

    const nextCode = this.generateNextInvoiceCode();
    this.invoiceForm.patchValue({invoiceCode: nextCode.toString()});
    this.invoiceForm.get('invoiceCode')?.disable({emitEvent: false});
  }

  closeDrawer(): void {
    if (this.isSaving) return;

    this.isDrawerVisible = false;
    this.isCopyMode = false;

    this.invoiceForm.reset({
      taxRate: 0.16,
      subtotal: 0,
      tax: 0,
      total: 0
    });

    this.items.clear();
    this.billableCarloads = [];
    this.selectedCarloadIds = [];
  }

  openInvoicePreview(invoice: CarloadInvoice): void {
    this.selectedInvoice = invoice;
    this.isPreviewDrawerVisible = true;
  }

  closeInvoicePreview(): void {
    this.isPreviewDrawerVisible = false;
    this.selectedInvoice = null;
  }

  copyPreviewedInvoice(): void {
    if (!this.selectedInvoice) return;

    const invoice = this.selectedInvoice;
    this.closeInvoicePreview();
    this.copyInvoice(invoice);
  }

  onInvoiceCustomerChange(customerId: string | null): void {
    this.billableCarloads = [];
    this.selectedCarloadIds = [];

    if (!customerId) {
      return;
    }

    this.isLoadingBillableCarloads = true;
    this.invoiceService.getBillableCarloads(customerId).subscribe({
      next: carloads => {
        this.billableCarloads = carloads || [];
        this.isLoadingBillableCarloads = false;
      },
      error: () => {
        this.isLoadingBillableCarloads = false;
        this.message.error('Erro ao carregar carradas por faturar.');
      }
    });
  }

  toggleCarloadSelection(carloadId: string, checked: boolean): void {
    if (checked) {
      this.selectedCarloadIds = Array.from(new Set([...this.selectedCarloadIds, carloadId]));
    } else {
      this.selectedCarloadIds = this.selectedCarloadIds.filter(id => id !== carloadId);
    }

    this.calculateTotals();
  }

  isCarloadSelected(carloadId: string): boolean {
    return this.selectedCarloadIds.includes(carloadId);
  }

  removeSelectedCarload(carloadId: string): void {
    this.toggleCarloadSelection(carloadId, false);
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      amount: [{value: 0, disabled: true}]
    });

    itemGroup.get('quantity')?.valueChanges.subscribe(() => this.updateItemAmount(itemGroup));
    itemGroup.get('unitPrice')?.valueChanges.subscribe(() => this.updateItemAmount(itemGroup));

    this.items.push(itemGroup);
    this.calculateTotals();
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
    this.calculateTotals();
  }

  onItemChange(itemName: string, index: number): void {
    const itemGroup = this.items.at(index) as FormGroup;
    const price = this.itemsPrices[itemName] || 0;

    itemGroup.patchValue(
      {
        unitPrice: price,
        quantity: 1
      },
      {emitEvent: false}
    );

    this.updateItemAmount(itemGroup);
  }

  getItemLabel(itemKey: string): string {
    return this.itemLabels[itemKey] || itemKey;
  }

  copyInvoice(invoice: CarloadInvoice): void {
    this.isCopyMode = true;
    this.isDrawerVisible = true;

    this.items.clear();
    this.billableCarloads = [];
    this.selectedCarloadIds = [];

    this.invoiceForm.reset({
      carloadCustomerId: invoice.carloadCustomerId,
      taxRate: invoice.taxRate ?? 0.16,
      subtotal: 0,
      tax: 0,
      total: 0
    });

    this.invoiceForm.patchValue({invoiceCode: this.generateNextInvoiceCode().toString()});
    this.invoiceForm.get('invoiceCode')?.disable({emitEvent: false});

    (invoice.items || []).forEach(item => {
      const itemGroup = this.fb.group({
        description: [this.normalizeMaterialType(item.description), Validators.required],
        quantity: [Number(item.quantity || 1), [Validators.required, Validators.min(1)]],
        unitPrice: [Number(item.unitPrice || 0), [Validators.required, Validators.min(0)]],
        amount: [{value: Number(item.amount || 0), disabled: true}]
      });

      itemGroup.get('quantity')?.valueChanges.subscribe(() => this.updateItemAmount(itemGroup));
      itemGroup.get('unitPrice')?.valueChanges.subscribe(() => this.updateItemAmount(itemGroup));

      this.items.push(itemGroup);
    });

    if (this.items.length === 0) {
      this.addItem();
    }

    this.calculateTotals();
  }

  getInvoiceItemLabel(item: CarloadInvoiceItem): string {
    return item.descriptionLabel || this.getItemLabel(item.description);
  }

  getInvoiceGrossSubtotal(invoice: CarloadInvoice): number {
    return this.getGrossSubtotal(invoice);
  }

  getInvoiceItemMeta(item: CarloadInvoiceItem): string {
    return [item.driverName, item.truckPlateNumber].filter(Boolean).join(' / ');
  }

  getInvoicePdfItemLabel(item: CarloadInvoiceItem): string {
    return this.getInvoiceItemLabel(item);
  }

  getBillableCarloadValue(carload: CarLoad): number {
    return Number(carload.customerPrice ?? carload.totalEarnings ?? 0);
  }

  getBillableCarloadLabel(carload: CarLoad): string {
    const itemName = this.getItemLabel(this.getCarloadInvoiceItemCode(carload));
    const details = this.getCarloadOperationalSummary(carload);
    const value = this.formatMoney(this.getBillableCarloadValue(carload));

    return [itemName, details, `${value} Mts`].filter(Boolean).join(' - ');
  }

  getCarloadInvoiceItemCode(carload: CarLoad): string {
    const truckSizeCode = this.normalizeInvoiceTruckSizeCode(carload.assignedTruckSize || carload.truckSize);
    const materialCode = this.normalizeInvoiceMaterialCode(carload.transportedMaterial);
    const itemCode = [truckSizeCode, materialCode].filter(Boolean).join('_');

    return this.itemsOptions.includes(itemCode) ? itemCode : '';
  }

  getCarloadCommercialItemName(carload: CarLoad): string {
    const itemCode = this.getCarloadInvoiceItemCode(carload);
    return itemCode ? this.getItemLabel(itemCode) : this.buildCommercialItemName(carload.assignedTruckSize || carload.truckSize, carload.transportedMaterial);
  }

  getCarloadOperationalSummary(carload: CarLoad): string {
    const details = [
      [carload.assignedDriverName, carload.assignedTruckPlateNumber || carload.assignedTruckSize].filter(Boolean).join(' / '),
      carload.deliveryDestination ? `Destino: ${carload.deliveryDestination}` : ''
    ].filter(Boolean);

    return details.join(' - ');
  }

  getCarloadItemDriverTruck(carload: CarLoad): string {
    return [carload.assignedDriverName, carload.assignedTruckPlateNumber || carload.assignedTruckSize]
      .filter(Boolean)
      .join(' / ') || '-';
  }

  private buildCommercialItemName(truckSize: string | null | undefined, material: string | null | undefined): string {
    const normalizedTruckSize = this.normalizeInvoiceTruckSize(truckSize);
    const normalizedMaterial = this.normalizeInvoiceMaterial(material);

    return [normalizedTruckSize, normalizedMaterial].filter(Boolean).join(' ') || 'Carrada';
  }

  private normalizeInvoiceTruckSize(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const normalized = value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/m(?:3|³|Â³)?/g, 'm')
      .replace(/\s+/g, '');

    const numericSize = normalized.match(/\d+/)?.[0];

    return numericSize ? `${numericSize}m` : normalized;
  }

  private normalizeInvoiceTruckSizeCode(value: string | null | undefined): string {
    const normalized = this.normalizeInvoiceTruckSize(value);
    const numericSize = normalized.match(/\d+/)?.[0];

    return numericSize ? `M${numericSize}` : '';
  }

  private normalizeInvoiceMaterial(value: string | null | undefined): string {
    if (!value) {
      return 'Carrada';
    }

    return value
      .toString()
      .replace(/_/g, ' ')
      .replace(/^\s*\d+\s*m(?:3|³|Â³)?\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeInvoiceMaterialCode(value: string | null | undefined): string {
    const material = this.normalizeInvoiceMaterial(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const aliases: Record<string, string> = {
      PO_DE_PEDRA: 'PO_DE_PEDRA',
      PO_PEDRA: 'PO_DE_PEDRA',
      PEDRA_3_4: 'PEDRA_3_4',
      PEDRA_34: 'PEDRA_3_4'
    };

    return aliases[material] || material;
  }

  submitInvoice(): void {
    if (this.selectedCarloadIds.length === 0 && this.items.length === 0) {
      this.message.warning('Selecione carradas concluidas ou adicione pelo menos um item manual.');
      return;
    }

    if (this.invoiceForm.invalid) {
      this.markControlTouched(this.invoiceForm);
      this.message.warning('Preencha os campos obrigatorios.');
      return;
    }

    this.isSaving = true;

    this.invoiceForm.get('invoiceCode')?.enable({emitEvent: false});
    const invoiceData = this.buildInvoicePayload();
    const wasCopyMode = this.isCopyMode;
    this.invoiceForm.get('invoiceCode')?.disable({emitEvent: false});

    this.invoiceService.addInvoice(invoiceData).subscribe({
      next: savedInvoice => {
        this.isSaving = false;
        this.closeDrawer();
        this.openInvoicePreview(savedInvoice || this.buildInvoicePreviewFallback(invoiceData));
        this.loadInvoices();
        this.message.success(wasCopyMode ? 'Copia da fatura criada com sucesso.' : 'Fatura criada com sucesso.');
      },
      error: () => {
        this.isSaving = false;
        this.message.error('Erro ao criar fatura.');
      }
    });
  }

  deleteInvoice(invoice: CarloadInvoice): void {
    this.confirmationDialog.confirmDelete({
      entity: this.t('common.entities.invoice'),
      name: invoice.invoiceCode,
      onOk: () => {
        this.invoiceService.deleteInvoice(invoice.id).subscribe({
          next: () => {
            this.loadInvoices();
            this.message.success(this.t('invoice.messages.deleted'));
          },
          error: () => this.message.error(this.t('invoice.messages.deleteError'))
        });
      }
    });
  }

  async downloadInvoice(invoice: CarloadInvoice): Promise<void> {
    const [{default: jsPDF}, {default: autoTable}] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const createdDate = new Date(invoice.createdAt || new Date().toISOString());
    const createdAtFormatted = this.formatDateOnly(createdDate.toISOString());
    const grossSubtotal = this.getGrossSubtotal(invoice);
    const taxRate = Number(invoice.taxRate || 0);
    const tax = Number(invoice.tax || 0);
    const total = Number(invoice.total || 0);

    doc.setFillColor(16, 33, 43);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setFillColor(14, 124, 114);
    doc.roundedRect(14, 9, 18, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(COMPANY_PROFILE.initials, 23, 21, {align: 'center'});
    doc.setFontSize(18);
    doc.text('FATURA', 38, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Documento comercial', 38, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_PROFILE.tradeName, pageWidth - 14, 14, {align: 'right'});

    doc.setFont('helvetica', 'normal');
    doc.text(COMPANY_PDF_LINES[0], pageWidth - 14, 19, {align: 'right'});
    doc.text(COMPANY_PDF_LINES[1], pageWidth - 14, 24, {align: 'right'});
    doc.text(COMPANY_PDF_LINES[2], pageWidth - 14, 29, {align: 'right'});
    doc.text(COMPANY_PDF_LINES[4], pageWidth - 14, 34, {align: 'right'});

    doc.setTextColor(16, 33, 43);
    doc.setDrawColor(223, 234, 240);
    doc.setFillColor(248, 251, 253);
    doc.roundedRect(14, 44, pageWidth - 28, 32, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Código:', 18, 52);
    doc.text('Data de criação:', 18, 60);
    doc.text('Criado por:', 18, 68);

    doc.setFont('helvetica', 'normal');
    doc.text(`${invoice.invoiceCode}`, 52, 52);
    doc.text(`${createdAtFormatted}`, 52, 60);
    doc.text(invoice.createdByName || 'Sistema', 52, 68);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 84, pageWidth - 28, 34, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', 18, 93);
    doc.text('Contacto:', 18, 101);
    doc.text('Código cliente:', 18, 109);

    const customer = this.dataCustomer.find(item => item.id === invoice.carloadCustomerId);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.carloadCustomerName || '-', 50, 93);
    doc.text(customer?.phoneNumber || '-', 50, 101);
    doc.text(customer?.customerCode || '-', 50, 109);

    autoTable(doc, {
      startY: 126,
      head: [['Item', 'Qtd', 'Preco Unitario', 'Subtotal']],
      body: invoice.items.map(item => [
        this.getInvoicePdfItemLabel(item),
        item.quantity,
        `${this.formatMoney(item.unitPrice)} Mts`,
        `${this.formatMoney(item.amount)} Mts`
      ]),
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3,
        textColor: [40, 40, 40],
        lineColor: [220, 220, 220],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [14, 124, 114],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 251, 253]
      },
      columnStyles: {
        0: {cellWidth: 86},
        1: {halign: 'center', cellWidth: 18},
        2: {halign: 'right', cellWidth: 38},
        3: {halign: 'right', cellWidth: 38}
      },
      margin: {left: 14, right: 14}
    });

    const finalY = (doc as any).lastAutoTable.finalY || 160;
    const totalsBoxWidth = 84;
    const totalsBoxX = pageWidth - totalsBoxWidth - 14;
    const totalsBoxY = finalY + 10;
    const totalsBoxHeight = 40;

    doc.setDrawColor(223, 234, 240);
    doc.setFillColor(248, 251, 253);
    doc.roundedRect(totalsBoxX, totalsBoxY, totalsBoxWidth, totalsBoxHeight, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Subtotal:', totalsBoxX + 4, totalsBoxY + 8);
    doc.text('IVA:', totalsBoxX + 4, totalsBoxY + 16);
    doc.text('Taxa:', totalsBoxX + 4, totalsBoxY + 24);
    doc.text('Total:', totalsBoxX + 4, totalsBoxY + 36);

    doc.setFont('helvetica', 'normal');
    doc.text(`${this.formatMoney(grossSubtotal)} Mts`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 8, {align: 'right'});
    doc.text(`${this.formatMoney(tax)} Mts`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 16, {align: 'right'});
    doc.text(`${(taxRate * 100).toFixed(0)}%`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 24, {align: 'right'});

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 124, 114);
    doc.text(`${this.formatMoney(total)} Mts`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 36, {align: 'right'});

    doc.setTextColor(16, 33, 43);
    doc.setDrawColor(223, 234, 240);
    doc.line(14, 275, pageWidth - 14, 275);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Documento gerado por ${COMPANY_PROFILE.legalName} | NUIT: ${COMPANY_PROFILE.nuit}`, 14, 282);
    doc.text(`Fatura emitida em ${createdAtFormatted}`, 14, 287);

    doc.save(this.documentFilename.build('FATURA', invoice.invoiceCode, invoice.carloadCustomerName));
  }

  formatMoney(value: number | null | undefined): string {
    return Number(value || 0).toFixed(2);
  }

  private formatDateOnly(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  private getGrossSubtotal(invoice: CarloadInvoice): number {
    return (invoice.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  private applyFilters(): void {
    let filtered = [...this.allInvoices];

    if (this.selectedCustomerId) {
      filtered = filtered.filter(inv => inv.carloadCustomerId === this.selectedCustomerId);
    }

    if (this.dateRange && this.dateRange.length === 2) {
      const [start, end] = this.dateRange;
      const startDate = new Date(start).setHours(0, 0, 0, 0);
      const endDate = new Date(end).setHours(23, 59, 59, 999);

      filtered = filtered.filter(inv => {
        const createdAt = new Date(inv.createdAt).getTime();
        return createdAt >= startDate && createdAt <= endDate;
      });
    }

    const val = (this.searchValue || '').toLowerCase().trim();
    if (val) {
      filtered = filtered.filter(inv =>
        (inv.invoiceCode || '').toLowerCase().includes(val) ||
        (inv.carloadCustomerName || '').toLowerCase().includes(val) ||
        (inv.createdByName || '').toLowerCase().includes(val) ||
        (inv.items || []).some(it =>
          (it.description || '').toLowerCase().includes(val) ||
          this.getInvoiceItemLabel(it).toLowerCase().includes(val) ||
          (it.driverName || '').toLowerCase().includes(val) ||
          (it.truckPlateNumber || '').toLowerCase().includes(val) ||
          (it.deliveryDestination || '').toLowerCase().includes(val)
        )
      );
    }

    this.invoices = filtered;
  }

  private updateItemAmount(itemGroup: FormGroup): void {
    const quantity = Number(itemGroup.get('quantity')?.value || 0);
    const unitPrice = Number(itemGroup.get('unitPrice')?.value || 0);
    const amount = quantity * unitPrice;

    itemGroup.patchValue({amount}, {emitEvent: false});
    this.calculateTotals();
  }

  private buildInvoicePayload(): any {
    const rawValue = this.invoiceForm.getRawValue();
    return {
      ...rawValue,
      carloadIds: this.selectedCarloadIds,
      items: (rawValue.items || []).map((item: any) => ({
        ...item,
        description: this.normalizeMaterialType(item.description)
      }))
    };
  }

  private buildInvoicePreviewFallback(invoiceData: any): CarloadInvoice {
    const customer = this.dataCustomer.find(item => item.id === invoiceData.carloadCustomerId);

    return {
      ...invoiceData,
      id: '',
      carloadCustomerName: customer?.name || '-',
      createdAt: new Date().toISOString(),
      items: invoiceData.items || []
    } as CarloadInvoice;
  }

  private normalizeMaterialType(value: string): string {
    if (!value) {
      return value;
    }

    const byLabel = Object.entries(this.itemLabels).find(([, label]) => label === value);
    return byLabel?.[0] || value;
  }

  private calculateTotals(): void {
    const selectedCarloadsTotal = this.billableCarloads
      .filter(carload => this.selectedCarloadIds.includes(carload.id))
      .reduce((sum, carload) => sum + this.getBillableCarloadValue(carload), 0);

    const subtotal = this.items.controls.reduce((sum, item) => {
      const amount = Number(item.get('amount')?.value || 0);
      return sum + amount;
    }, selectedCarloadsTotal);

    const taxRate = Number(this.invoiceForm.get('taxRate')?.value || 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    this.invoiceForm.patchValue(
      {
        subtotal,
        tax,
        total
      },
      {emitEvent: false}
    );
  }

  private initForm(): void {
    this.invoiceForm = this.fb.group({
      carloadCustomerId: ['', Validators.required],
      invoiceCode: ['', Validators.required],
      items: this.fb.array([]),
      taxRate: [0.16, Validators.required],
      subtotal: [{value: 0, disabled: true}],
      tax: [{value: 0, disabled: true}],
      total: [{value: 0, disabled: true}]
    });

    this.invoiceForm.get('taxRate')?.valueChanges.subscribe(() => this.calculateTotals());
  }

  private loadInvoices(): void {
    this.isLoading = true;
    this.invoiceService.getInvoices().subscribe({
      next: data => {
        this.allInvoices = data || [];
        this.totalInvoices = this.allInvoices.length;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.message.error('Erro ao carregar faturas.');
      }
    });
  }

  private loadCustomers(): void {
    this.customerService.getCustomers().subscribe({
      next: data => {
        this.dataCustomer = data || [];
        this.totalCustomers = this.dataCustomer.length;
      },
      error: () => this.message.error('Erro ao carregar clientes.')
    });
  }

  private loadProductPrices(): void {
    this.productPriceService.getActivePrices().subscribe({
      next: prices => {
        if (!prices?.length) return;

        this.itemsOptions = prices.map(item => item.code);
        this.itemLabels = prices.reduce((acc, item) => {
          acc[item.code] = item.label;
          return acc;
        }, {} as { [key: string]: string });
        this.itemsPrices = prices.reduce((acc, item) => {
          acc[item.code] = Number(item.salePrice || 0);
          return acc;
        }, {} as { [key: string]: number });
      },
      error: () => this.message.warning('Catálogo de preços indisponivel. A usar preços locais.')
    });
  }

  private getPresetRange(preset: InvoicePeriodPreset): Date[] | null {
    if (preset === 'ALL' || preset === 'CUSTOM') {
      return null;
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setHours(0, 0, 0, 0);

    if (preset === 'THIS_MONTH') {
      start.setDate(1);
    }

    if (preset === 'LAST_30_DAYS') {
      start.setDate(start.getDate() - 29);
    }

    return [start, end];
  }

  private markControlTouched(control: AbstractControl): void {
    control.markAsDirty();
    control.markAsTouched();

    if (control instanceof FormGroup || control instanceof FormArray) {
      Object.values(control.controls).forEach(child => this.markControlTouched(child));
    }
  }

  private generateNextInvoiceCode(): number {
    if (!this.allInvoices || this.allInvoices.length === 0) {
      return 1001;
    }

    const lastCode = Math.max(...this.allInvoices.map(inv => Number(inv.invoiceCode) || 0));
    return lastCode + 1;
  }

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }
}
