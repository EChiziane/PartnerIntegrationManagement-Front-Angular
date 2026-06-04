import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { CarloadQuote } from '@shared/models/carload-quote';
import { CarloadQuoteItem } from '@shared/models/carload-quote-item';
import { CarloadQuoteService } from '@core/services/carload-quote.service';
import {CarloadCustomer} from '@shared/models/carload-customer';
import {CarloadCustomerService} from '@core/services/carload-customer.service';
import {LocationSuggestion, LocationSuggestionService} from '@core/services/location-suggestion.service';
import {TranslationService} from '@core/services/translation.service';
import {ConfirmationDialogService} from '@core/services/confirmation-dialog.service';
import {DocumentFilenameService} from '@core/services/document-filename.service';
import {COMPANY_PDF_LINES, COMPANY_PROFILE} from '@shared/data/company-profile';
import {ProductPriceService} from '@core/services/product-price.service';

type CustomerMode = 'NEW' | 'EXISTING';

@Component({
  selector: 'app-quote',
  standalone: false,
  templateUrl: './quote.component.html',
  styleUrls: ['./quote.component.scss']
})
export class QuoteComponent implements OnInit {
  quotes: CarloadQuote[] = [];
  allQuotes: CarloadQuote[] = [];

  isLoading = false;
  isSaving = false;

  isDrawerVisible = false;
  currentQuoteId: string | null = null;
  currentQuoteCode: string | null = null;

  searchValue = '';
  dateRange: Date[] | null = null;

  totalQuotes = 0;
  filteredQuotes = 0;
  filteredTotalAmount = 0;

  drawerWidth: string | number = 1000;
  drawerPlacement: 'right' | 'bottom' = 'right';

  quoteForm!: FormGroup;
  destinationSuggestions: LocationSuggestion[] = [];
  customers: CarloadCustomer[] = [];
  customerMode: CustomerMode = 'NEW';

  itemsOptions: string[] = [];

  itemsPrices: { [key: string]: number } = {
    '4m Areia grossa': 6000,
    '4m Areia vermelha': 3500,
    '4m Areia fina': 5000,
    '4m Pedra 3/4': 5500,
    '4m Pedra Enrocamento': 5500,
    '4m Pedra Sarrisca': 25000,

    '7m Areia grossa': 9000,
    '7m Areia vermelha': 4500,
    '7m Areia fina': 6500,
    '7m Pedra 3/4': 8000,
    '7m Pedra Enrocamento': 8000,
    '7m Pedra Sarrisca': 8000,

    '18m Areia grossa': 19000,
    '18m Areia vermelha': 8000,
    '18m Areia fina': 13000,
    '18m Pedra 3/4': 18000,
    '18m Pedra Enrocamento': 18000,
    '18m Pedra Sarrisca': 18000,

    '22m Areia grossa': 20000,
    '22m Areia vermelha': 9000,
    '22m Areia fina': 15000,
    '22m Pedra 3/4': 22000,
    '22m Pedra Enrocamento': 22000,
    '22m Pedra Sarrisca': 22000,

    '24m Areia grossa': 23000,
    '24m Areia vermelha': 11000,
    '24m Areia fina': 16000,
    '24m Pedra 3/4': 25000,
    '24m Pedra Enrocamento': 25000,
    '24m Pedra Sarrisca': 25000,
  };

  constructor(
    private fb: FormBuilder,
    private quoteService: CarloadQuoteService,
    private customerService: CarloadCustomerService,
    private locationSuggestionService: LocationSuggestionService,
    private message: NzMessageService,
    private modal: NzModalService,
    private confirmationDialog: ConfirmationDialogService,
    private translationService: TranslationService,
    private documentFilename: DocumentFilenameService,
    private productPriceService: ProductPriceService
  ) {}

  get items(): FormArray {
    return this.quoteForm.get('items') as FormArray;
  }

  get drawerTitle(): string {
    return this.currentQuoteId
      ? this.t('quotes.drawer.editTitle')
      : this.t('quotes.drawer.createTitle');
  }

  ngOnInit(): void {
    this.initForm();
    this.loadQuotes();
    this.loadCustomers();
    this.loadProductPrices();
    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());
    this.itemsOptions = Object.keys(this.itemsPrices);

    this.quoteForm.get('customerId')?.valueChanges.subscribe(value => {
      if (this.customerMode === 'EXISTING' && value) {
        this.fillCustomerFromSelection(value);
      }
    });
  }

  updateDrawer(): void {
    if (window.innerWidth <= 768) {
      this.drawerWidth = '100%';
      this.drawerPlacement = 'right';
    } else {
      this.drawerWidth = 1000;
      this.drawerPlacement = 'right';
    }
  }

  onBack(): void {
    window.history.back();
  }

  openDrawer(): void {
    this.currentQuoteId = null;
    this.currentQuoteCode = null;
    this.customerMode = 'NEW';
    this.isDrawerVisible = true;

    this.quoteForm.reset({
      quoteCode: this.generateNextQuoteCode(),
      customerId: null,
      customerName: '',
      customerPhoneNumber: '',
      destination: '',
      discount: 0,
      taxRate: 0.16,
      notes: '',
      validUntil: null,
      subtotal: 0,
      tax: 0,
      total: 0
    });

    this.items.clear();
    this.addItem();
    this.applyCustomerModeRules();
  }

  closeDrawer(): void {
    if (this.isSaving) return;

    this.isDrawerVisible = false;
    this.currentQuoteId = null;
    this.currentQuoteCode = null;
    this.customerMode = 'NEW';
    this.quoteForm.reset();
    this.items.clear();
  }

  setCustomerMode(mode: CustomerMode): void {
    this.customerMode = mode;

    if (mode === 'EXISTING') {
      this.quoteForm.patchValue({
        customerId: null,
        customerName: '',
        customerPhoneNumber: ''
      });
    } else {
      this.quoteForm.patchValue({customerId: null});
    }

    this.applyCustomerModeRules();
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      amount: [{ value: 0, disabled: true }]
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
      { emitEvent: false }
    );

    this.updateItemAmount(itemGroup);
  }

  onDestinationSearch(value: string): void {
    this.destinationSuggestions = this.locationSuggestionService.search(value);
  }

  rememberDestination(): void {
    this.locationSuggestionService.remember(this.quoteForm.get('destination')?.value);
  }

  submitQuote(): void {
    if (this.quoteForm.invalid || this.items.length === 0) {
      this.message.warning('Preencha os campos obrigatórios.');
      return;
    }

    this.isSaving = true;

    const raw = this.quoteForm.getRawValue();
    this.locationSuggestionService.remember(raw.destination);
    const selectedCustomer = this.customerMode === 'EXISTING'
      ? this.customers.find(customer => customer.id === raw.customerId)
      : null;
    const customerName = selectedCustomer?.name || raw.customerName;
    const normalizedPhone = this.normalizePhone(selectedCustomer?.phoneNumber || raw.customerPhoneNumber);

    const payload: CarloadQuote = {
      quoteCode: this.currentQuoteId
        ? (this.currentQuoteCode || raw.quoteCode)
        : raw.quoteCode,
      customerName,
      customerPhoneNumber: normalizedPhone,
      destination: raw.destination || '',
      items: this.items.getRawValue().map((item: CarloadQuoteItem) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.quantity) * Number(item.unitPrice)
      })),
      subtotal: Number(raw.subtotal || 0),
      discount: Number(raw.discount || 0),
      taxRate: Number(raw.taxRate || 0),
      tax: Number(raw.tax || 0),
      total: Number(raw.total || 0),
      notes: raw.notes || '',
      validUntil: raw.validUntil || null
    };

    if (this.currentQuoteId) {
      this.quoteService.updateQuote(this.currentQuoteId, payload).subscribe({
        next: () => {
          this.message.success('Nova versão da cotação criada com sucesso!');
          this.isSaving = false;
          this.loadQuotes();
          this.closeDrawer();
        },
        error: () => {
          this.isSaving = false;
          this.message.error('Erro ao actualizar a cotação.');
        }
      });
    } else {
      this.quoteService.addQuote(payload).subscribe({
        next: () => {
          this.message.success('Cotação criada com sucesso!');
          this.isSaving = false;
          this.loadQuotes();
          this.closeDrawer();
        },
        error: () => {
          this.isSaving = false;
          this.message.error('Erro ao criar a cotação.');
        }
      });
    }
  }

  editQuote(quote: CarloadQuote): void {
    this.currentQuoteId = quote.id || null;
    this.currentQuoteCode = quote.quoteCode;
    const existingCustomer = this.findMatchingCustomer(quote);
    this.customerMode = existingCustomer ? 'EXISTING' : 'NEW';
    this.isDrawerVisible = true;

    this.items.clear();

    quote.items.forEach(item => {
      const group = this.fb.group({
        description: [item.description, Validators.required],
        quantity: [item.quantity, [Validators.required, Validators.min(1)]],
        unitPrice: [item.unitPrice, [Validators.required, Validators.min(0)]],
        amount: [{ value: item.amount, disabled: true }]
      });

      group.get('quantity')?.valueChanges.subscribe(() => this.updateItemAmount(group));
      group.get('unitPrice')?.valueChanges.subscribe(() => this.updateItemAmount(group));

      this.items.push(group);
    });

    this.quoteForm.patchValue({
      quoteCode: quote.quoteCode,
      customerId: existingCustomer?.id || null,
      customerName: quote.customerName,
      customerPhoneNumber: (quote.customerPhoneNumber || '').replace('+258', '').trim(),
      destination: quote.destination,
      discount: quote.discount,
      taxRate: quote.taxRate ?? 0.16,
      notes: quote.notes,
      validUntil: quote.validUntil ? this.toDateInput(quote.validUntil) : null,
      subtotal: quote.subtotal,
      tax: quote.tax ?? 0,
      total: quote.total
    });

    this.calculateTotals();
    this.applyCustomerModeRules();
  }

  duplicateQuote(quote: CarloadQuote): void {
    const payload: CarloadQuote = {
      quoteCode: this.generateNextQuoteCode(),
      customerName: quote.customerName,
      customerPhoneNumber: quote.customerPhoneNumber,
      destination: quote.destination || '',
      items: (quote.items || []).map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount)
      })),
      subtotal: Number(quote.subtotal || 0),
      discount: Number(quote.discount || 0),
      taxRate: Number(quote.taxRate || 0),
      tax: Number(quote.tax || 0),
      total: Number(quote.total || 0),
      notes: quote.notes || '',
      validUntil: quote.validUntil || null
    };

    this.quoteService.addQuote(payload).subscribe({
      next: () => {
        this.loadQuotes();
        this.message.success('Cotação duplicada com sucesso!');
      },
      error: () => {
        this.message.error('Erro ao duplicar a cotação.');
      }
    });
  }

  viewQuoteVersions(quote: CarloadQuote): void {
    if (!quote.id) return;

    this.quoteService.getQuoteVersions(quote.id).subscribe({
      next: versions => {
        const rows = (versions || [])
          .map(version => {
            const createdAt = version.createdAt
              ? this.formatDateOnly(version.createdAt)
              : '-';
            const total = this.formatMoney(Number(version.total || 0));
            return `<li><strong>v${version.versionNumber || 1}</strong> - ${createdAt} - ${total} Mts</li>`;
          })
          .join('');

        this.modal.info({
          nzCentered: true,
          nzClassName: 'tc-confirm-info',
          nzTitle: `Versoes da cotacao ${quote.quoteCode}`,
          nzContent: `<ul>${rows || '<li>Sem historico de versoes.</li>'}</ul>`,
          nzOkText: 'Fechar'
        });
      },
      error: () => {
        this.message.error('Erro ao carregar versoes da cotacao.');
      }
    });
  }

  approveAndGenerateCarloads(quote: CarloadQuote): void {
    if (!quote.id) return;

    this.modal.confirm({
      nzCentered: true,
      nzClassName: 'tc-confirm-info',
      nzTitle: this.t('quotes.confirmation.approveTitle'),
      nzContent: this.t('quotes.confirmation.approveContent', {code: quote.quoteCode}),
      nzOkText: this.t('quotes.confirmation.approveOk'),
      nzCancelText: this.t('common.actions.cancel'),
      nzOnOk: () => {
        this.quoteService.approveAndGenerateCarloads(quote.id as string).subscribe({
          next: carloads => {
            this.loadQuotes();
            this.message.success(`${carloads.length} carrada(s) gerada(s) a partir da cotacao.`);
          },
          error: () => {
            this.message.error('Erro ao gerar carradas da cotacao.');
          }
        });
      }
    });
  }

  canGenerateCarloads(quote: CarloadQuote): boolean {
    return (quote.generatedCarloadsCount || 0) === 0;
  }

  getQuoteStatusLabel(quote: CarloadQuote): string {
    const statusMap: Record<string, string> = {
      DRAFT: 'Rascunho',
      SENT: 'Enviada',
      APPROVED: 'Aprovada',
      REJECTED: 'Rejeitada',
      EXPIRED: 'Expirada'
    };

    return statusMap[quote.quoteStatus || 'DRAFT'] || 'Rascunho';
  }

  getQuoteStatusColor(quote: CarloadQuote): string {
    const status = (quote.quoteStatus || 'DRAFT').toUpperCase();
    if (status === 'APPROVED') return 'green';
    if (status === 'SENT') return 'blue';
    if (status === 'REJECTED' || status === 'EXPIRED') return 'red';
    return 'default';
  }

  phoneHref(phone: string | null | undefined): string {
    const digits = (phone || '').toString().replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : 'tel:';
  }

  getQuoteVersionLabel(quote: CarloadQuote): string {
    return `v${quote.versionNumber || 1}`;
  }

  deleteQuote(quote: CarloadQuote): void {
    this.confirmationDialog.confirmDelete({
      entity: this.t('common.entities.quote'),
      details: this.t('common.confirmation.deleteQuoteContent', {code: quote.quoteCode, customer: quote.customerName}),
      onOk: () => {
        if (!quote.id) return;

        this.quoteService.deleteQuote(quote.id).subscribe({
          next: () => {
            this.loadQuotes();
            this.message.success(this.t('quotes.messages.deleted'));
          },
          error: () => {
            this.message.error(this.t('quotes.messages.deleteError'));
          }
        });
      }
    });
  }

  async downloadQuote(quote: CarloadQuote): Promise<void> {
    const [{default: jsPDF}, {default: autoTable}] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const createdDate = new Date(quote.createdAt || new Date().toISOString());
    const validUntilDate = quote.validUntil
      ? new Date(quote.validUntil)
      : new Date(createdDate);

    if (!quote.validUntil) {
      validUntilDate.setDate(validUntilDate.getDate() + 7);
    }

    const createdAtFormatted = this.formatDateOnly(createdDate.toISOString());
    const validUntilFormatted = this.formatDateOnly(validUntilDate.toISOString());

    const grossSubtotal = this.getGrossSubtotal(quote);
    const discount = Number(quote.discount || 0);
    const netSubtotal = Math.max(grossSubtotal - discount, 0);
    const taxRate = Number(quote.taxRate || 0);
    const tax = Number(quote.tax || 0);
    const total = Number(quote.total || 0);

    doc.setFillColor(16, 33, 43);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setFillColor(14, 124, 114);
    doc.roundedRect(14, 9, 18, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(COMPANY_PROFILE.initials, 23, 21, { align: 'center' });
    doc.setFontSize(18);
    doc.text('COTAÇÃO', 38, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Documento comercial', 38, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_PROFILE.tradeName, pageWidth - 14, 14, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text(COMPANY_PDF_LINES[0], pageWidth - 14, 19, { align: 'right' });
    doc.text(COMPANY_PDF_LINES[1], pageWidth - 14, 24, { align: 'right' });
    doc.text(COMPANY_PDF_LINES[2], pageWidth - 14, 29, { align: 'right' });
    doc.text(COMPANY_PDF_LINES[4], pageWidth - 14, 34, { align: 'right' });

    doc.setTextColor(16, 33, 43);
    doc.setDrawColor(223, 234, 240);
    doc.setFillColor(248, 251, 253);
    doc.roundedRect(14, 44, pageWidth - 28, 32, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Código:', 18, 50);
    doc.text('Data de criação:', 18, 57);
    doc.text('Validade:', 18, 64);
    doc.text('Criado por:', 18, 71);

    doc.setFont('helvetica', 'normal');
    doc.text(`${quote.quoteCode}`, 52, 50);
    doc.text(`${createdAtFormatted}`, 52, 57);
    doc.text(`${createdAtFormatted} até ${validUntilFormatted}`, 52, 64);
    doc.text(quote.createdByName || 'Sistema', 52, 71);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 84, pageWidth - 28, 34, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', 18, 93);
    doc.text('Contacto:', 18, 101);
    doc.text('Destino:', 18, 109);

    doc.setFont('helvetica', 'normal');
    doc.text(quote.customerName || '—', 45, 93);
    doc.text(quote.customerPhoneNumber || '—', 45, 101);
    doc.text(quote.destination || '—', 45, 109);

    autoTable(doc, {
      startY: 126,
      head: [['Item', 'Qtd', 'Preço Unit.', 'Subtotal']],
      body: quote.items.map(item => [
        item.description,
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
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 38 },
        3: { halign: 'right', cellWidth: 38 }
      },
      margin: { left: 14, right: 14 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 160;

    const totalsBoxWidth = 84;
    const totalsBoxX = pageWidth - totalsBoxWidth - 14;
    const totalsBoxY = finalY + 10;
    const totalsBoxHeight = 48;

    doc.setDrawColor(223, 234, 240);
    doc.setFillColor(248, 251, 253);
    doc.roundedRect(totalsBoxX, totalsBoxY, totalsBoxWidth, totalsBoxHeight, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Subtotal:', totalsBoxX + 4, totalsBoxY + 8);
    doc.text('Desconto:', totalsBoxX + 4, totalsBoxY + 16);
    doc.text('Subtotal líq.:', totalsBoxX + 4, totalsBoxY + 24);
    doc.text('IVA:', totalsBoxX + 4, totalsBoxY + 32);
    doc.text('Valor IVA:', totalsBoxX + 4, totalsBoxY + 40);
    doc.text('Total:', totalsBoxX + 4, totalsBoxY + 48);

    doc.setFont('helvetica', 'normal');
    doc.text(`${this.formatMoney(grossSubtotal)} Mts`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 8, { align: 'right' });
    doc.text(`${this.formatMoney(discount)} Mts`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 16, { align: 'right' });
    doc.text(`${this.formatMoney(netSubtotal)} Mts`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 24, { align: 'right' });
    doc.text(`${(taxRate * 100).toFixed(0)}%`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 32, { align: 'right' });
    doc.text(`${this.formatMoney(tax)} Mts`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 40, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 124, 114);
    doc.text(`${this.formatMoney(total)} Mts`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 48, { align: 'right' });
    doc.setTextColor(16, 33, 43);

    let notesY = totalsBoxY + totalsBoxHeight + 12;

    if (quote.notes) {
      doc.setDrawColor(223, 234, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, notesY, pageWidth - 28, 28, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.text('Observações:', 18, notesY + 8);

      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(quote.notes, pageWidth - 40);
      doc.text(splitNotes, 18, notesY + 16);
    }

    doc.setDrawColor(223, 234, 240);
    doc.line(14, 275, pageWidth - 14, 275);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Documento gerado por ${COMPANY_PROFILE.legalName} | NUIT: ${COMPANY_PROFILE.nuit}`, 14, 282);
    doc.text(`Validade da cotação: 7 dias (${createdAtFormatted} até ${validUntilFormatted})`, 14, 287);

    doc.save(this.documentFilename.build('COTACAO', quote.quoteCode, quote.customerName));
  }

  search(): void {
    this.applyFilters();
  }

  filterByDateRange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchValue = '';
    this.dateRange = null;
    this.applyFilters();
  }

  private initForm(): void {
    this.quoteForm = this.fb.group({
      quoteCode: ['', Validators.required],
      customerId: [null],
      customerName: [''],
      customerPhoneNumber: ['', Validators.required],
      destination: [''],
      items: this.fb.array([]),
      discount: [0, [Validators.min(0)]],
      taxRate: [0.16, [Validators.required, Validators.min(0)]],
      notes: [''],
      validUntil: [null],
      subtotal: [{ value: 0, disabled: true }],
      tax: [{ value: 0, disabled: true }],
      total: [{ value: 0, disabled: true }]
    });

    this.quoteForm.get('discount')?.valueChanges.subscribe(() => this.calculateTotals());
    this.quoteForm.get('taxRate')?.valueChanges.subscribe(() => this.calculateTotals());
    this.applyCustomerModeRules();
  }

  private loadQuotes(): void {
    this.isLoading = true;

    this.quoteService.getQuotes().subscribe({
      next: (quotes) => {
        this.allQuotes = quotes || [];
        this.totalQuotes = this.allQuotes.length;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.message.error('Erro ao carregar cotações.');
      }
    });
  }

  private loadCustomers(): void {
    this.customerService.getCustomers().subscribe({
      next: customers => (this.customers = customers || []),
      error: () => this.message.error('Erro ao carregar clientes.')
    });
  }

  private loadProductPrices(): void {
    this.productPriceService.getActivePrices().subscribe({
      next: prices => {
        if (!prices?.length) return;

        this.itemsPrices = prices.reduce((acc, item) => {
          acc[item.label] = Number(item.salePrice || 0);
          return acc;
        }, {} as { [key: string]: number });
        this.itemsOptions = Object.keys(this.itemsPrices);
      },
      error: () => this.message.warning('Catalogo de precos indisponivel. A usar precos locais.')
    });
  }

  private applyFilters(): void {
    let filtered = [...this.allQuotes];

    const search = (this.searchValue || '').toLowerCase().trim();
    if (search) {
      filtered = filtered.filter(quote =>
        (quote.quoteCode || '').toLowerCase().includes(search) ||
        (quote.customerName || '').toLowerCase().includes(search) ||
        (quote.customerPhoneNumber || '').toLowerCase().includes(search) ||
        (quote.destination || '').toLowerCase().includes(search) ||
        (quote.items || []).some(item => (item.description || '').toLowerCase().includes(search))
      );
    }

    if (this.dateRange && this.dateRange.length === 2) {
      const [start, end] = this.dateRange;
      const startDate = new Date(start).setHours(0, 0, 0, 0);
      const endDate = new Date(end).setHours(23, 59, 59, 999);

      filtered = filtered.filter(quote => {
        const createdAt = new Date(quote.createdAt || '').getTime();
        return createdAt >= startDate && createdAt <= endDate;
      });
    }

    this.quotes = filtered;
    this.filteredQuotes = filtered.length;
    this.filteredTotalAmount = filtered.reduce((sum, q) => sum + Number(q.total || 0), 0);
  }

  private updateItemAmount(itemGroup: FormGroup): void {
    const quantity = Number(itemGroup.get('quantity')?.value || 0);
    const unitPrice = Number(itemGroup.get('unitPrice')?.value || 0);
    const amount = quantity * unitPrice;

    itemGroup.patchValue({ amount }, { emitEvent: false });
    this.calculateTotals();
  }

  private calculateTotals(): void {
    const grossSubtotal = this.items.controls.reduce((sum, item) => {
      const quantity = Number(item.get('quantity')?.value || 0);
      const unitPrice = Number(item.get('unitPrice')?.value || 0);
      return sum + (quantity * unitPrice);
    }, 0);

    const discount = Number(this.quoteForm.get('discount')?.value || 0);
    const taxRate = Number(this.quoteForm.get('taxRate')?.value || 0);

    const netSubtotal = Math.max(grossSubtotal - discount, 0);
    const tax = netSubtotal * taxRate;
    const total = netSubtotal + tax;

    this.quoteForm.patchValue(
      {
        subtotal: netSubtotal,
        tax,
        total
      },
      { emitEvent: false }
    );
  }

  private getGrossSubtotal(quote: CarloadQuote): number {
    return (quote.items || []).reduce((sum, item) => {
      return sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0));
    }, 0);
  }

  private normalizePhone(phone: string): string {
    const raw = (phone || '').toString().trim();
    return raw.startsWith('+258') ? raw : `+258 ${raw}`;
  }

  private applyCustomerModeRules(): void {
    if (!this.quoteForm) return;

    const customerIdCtrl = this.quoteForm.get('customerId');
    const customerNameCtrl = this.quoteForm.get('customerName');
    const customerPhoneCtrl = this.quoteForm.get('customerPhoneNumber');

    if (!customerIdCtrl || !customerNameCtrl || !customerPhoneCtrl) return;

    if (this.customerMode === 'EXISTING') {
      customerIdCtrl.setValidators([Validators.required]);
      customerNameCtrl.clearValidators();
      customerPhoneCtrl.clearValidators();
    } else {
      customerIdCtrl.clearValidators();
      customerNameCtrl.setValidators([Validators.required]);
      customerPhoneCtrl.setValidators([Validators.required]);
    }

    customerIdCtrl.updateValueAndValidity({emitEvent: false});
    customerNameCtrl.updateValueAndValidity({emitEvent: false});
    customerPhoneCtrl.updateValueAndValidity({emitEvent: false});
  }

  private fillCustomerFromSelection(customerId: string): void {
    const customer = this.customers.find(item => item.id === customerId);
    if (!customer) return;

    this.quoteForm.patchValue({
      customerName: customer.name,
      customerPhoneNumber: (customer.phoneNumber || '').replace('+258', '').trim()
    }, {emitEvent: false});
  }

  private findMatchingCustomer(quote: CarloadQuote): CarloadCustomer | null {
    const phone = this.normalizePhone(quote.customerPhoneNumber || '');
    return this.customers.find(customer => this.normalizePhone(customer.phoneNumber || '') === phone) || null;
  }

  private toDateInput(value: string): string {
    const date = new Date(value);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private formatDateOnly(value: string): string {
    const date = new Date(value);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private formatMoney(value: number): string {
    return Number(value || 0).toFixed(2);
  }

  private generateNextQuoteCode(): string {
    if (!this.allQuotes.length) return 'COT-1001';

    const max = Math.max(
      ...this.allQuotes.map(q => {
        const numeric = Number((q.quoteCode || '').replace(/\D/g, ''));
        return isNaN(numeric) ? 1000 : numeric;
      })
    );

    return `COT-${max + 1}`;
  }
  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }

}
