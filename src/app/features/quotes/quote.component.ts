import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { CarloadQuote } from '@shared/models/carload-quote';
import { CarloadQuoteItem } from '@shared/models/carload-quote-item';
import { CarloadQuoteService } from '@core/services/carload-quote.service';

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
    private message: NzMessageService,
    private modal: NzModalService
  ) {}

  get items(): FormArray {
    return this.quoteForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadQuotes();
    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());
    this.itemsOptions = Object.keys(this.itemsPrices);
  }

  updateDrawer(): void {
    if (window.innerWidth <= 768) {
      this.drawerWidth = '100%';
      this.drawerPlacement = 'bottom';
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
    this.isDrawerVisible = true;

    this.quoteForm.reset({
      quoteCode: this.generateNextQuoteCode(),
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
  }

  closeDrawer(): void {
    if (this.isSaving) return;

    this.isDrawerVisible = false;
    this.currentQuoteId = null;
    this.currentQuoteCode = null;
    this.quoteForm.reset();
    this.items.clear();
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

  submitQuote(): void {
    if (this.quoteForm.invalid || this.items.length === 0) {
      this.message.warning('Preencha os campos obrigatórios.');
      return;
    }

    this.isSaving = true;

    const raw = this.quoteForm.getRawValue();
    const normalizedPhone = this.normalizePhone(raw.customerPhoneNumber);

    const payload: CarloadQuote = {
      quoteCode: this.currentQuoteId
        ? (this.currentQuoteCode || raw.quoteCode)
        : raw.quoteCode,
      customerName: raw.customerName,
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
    this.currentQuoteCode = this.generateNextQuoteCode(),
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

  deleteQuote(quote: CarloadQuote): void {
    this.modal.confirm({
      nzTitle: 'Tens certeza que quer eliminar esta cotação?',
      nzContent: `Cotação: <strong>${quote.quoteCode}</strong> — Cliente: <strong>${quote.customerName}</strong>`,
      nzOkDanger: true,
      nzOkText: 'Sim',
      nzCancelText: 'Não',
      nzOnOk: () => {
        if (!quote.id) return;

        this.quoteService.deleteQuote(quote.id).subscribe({
          next: () => {
            this.loadQuotes();
            this.message.success('Cotação eliminada com sucesso!');
          },
          error: () => {
            this.message.error('Erro ao eliminar a cotação.');
          }
        });
      }
    });
  }

  downloadQuote(quote: CarloadQuote): void {
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
    doc.text('TC', 23, 21, { align: 'center' });
    doc.setFontSize(18);
    doc.text('COTAÇÃO', 38, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Documento comercial', 38, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Transportes Chiziane', pageWidth - 14, 14, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('Bairro Cumbe km16', pageWidth - 14, 20, { align: 'right' });
    doc.text('Av. de Moçambique 2063', pageWidth - 14, 25, { align: 'right' });
    doc.text('Tel: 845098583 / 879985279', pageWidth - 14, 30, { align: 'right' });

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
    doc.text('Documento gerado por Transportes Chiziane', 14, 282);
    doc.text(`Validade da cotação: 7 dias (${createdAtFormatted} até ${validUntilFormatted})`, 14, 287);

    doc.save(`${quote.quoteCode}_${(quote.customerName || 'cliente').replace(/\s+/g, '_')}.pdf`);
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
      customerName: ['', Validators.required],
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
}
