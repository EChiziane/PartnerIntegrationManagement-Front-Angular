
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { CarloadQuote } from '../../models/CarloadQuote';
import { CarloadQuoteItem } from '../../models/CarloadQuoteItem';
import { CarloadQuoteService } from '../../services/carload-quote.service';
import {Component, OnInit} from '@angular/core';

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

  searchValue = '';
  dateRange: Date[] | null = null;

  totalQuotes = 0;
  filteredQuotes = 0;
  filteredTotalAmount = 0;

  drawerWidth: string | number = 1000;
  drawerPlacement: 'right' | 'bottom' = 'right';

  quoteForm!: FormGroup;

  itemsOptions: string[] = [
    '4m Areia grossa',
    '4m Areia vermelha',
    '4m Areia fina',
    '4m Pedra 3/4',
    '7m Areia grossa',
    '7m Areia vermelha',
    '7m Areia fina',
    '7m Pedra 3/4',
    '18m Areia grossa',
    '18m Areia vermelha',
    '18m Areia fina',
    '18m Pedra 3/4',
    '22m Areia grossa',
    '22m Areia vermelha',
    '22m Areia fina',
    '22m Pedra 3/4',
    'Enrocamento'
  ];

  itemsPrices: { [key: string]: number } = {
    '4m Areia grossa': 5000,
    '4m Areia vermelha': 3000,
    '4m Areia fina': 4500,
    '4m Pedra 3/4': 5500,

    '7m Areia grossa': 7500,
    '7m Areia vermelha': 4500,
    '7m Areia fina': 6500,
    '7m Pedra 3/4': 8000,

    '18m Areia grossa': 17000,
    '18m Areia vermelha': 8000,
    '18m Areia fina': 12000,
    '18m Pedra 3/4': 18000,

    '22m Areia grossa': 22000,
    '22m Areia vermelha': 11000,
    '22m Areia fina': 16000,
    '22m Pedra 3/4': 25000,

    'Enrocamento': 25000
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
    this.isDrawerVisible = true;

    this.quoteForm.reset({
      quoteCode: this.quoteService.generateNextQuoteCode(),
      customerName: '',
      customerPhoneNumber: '',
      destination: '',
      discount: 0,
      notes: '',
      validUntil: null,
      subtotal: 0,
      total: 0
    });

    this.items.clear();
    this.addItem();
  }

  closeDrawer(): void {
    if (this.isSaving) return;

    this.isDrawerVisible = false;
    this.currentQuoteId = null;
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

    itemGroup.patchValue({
      unitPrice: price,
      quantity: 1
    }, { emitEvent: false });

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

    const quote: CarloadQuote = {
      id: this.currentQuoteId || this.quoteService.generateId(),
      quoteCode: raw.quoteCode,
      customerName: raw.customerName,
      customerPhoneNumber: normalizedPhone,
      destination: raw.destination || '',
      items: this.items.getRawValue().map((item: CarloadQuoteItem) => ({
        ...item,
        amount: Number(item.quantity) * Number(item.unitPrice)
      })),
      subtotal: Number(raw.subtotal || 0),
      discount: Number(raw.discount || 0),
      total: Number(raw.total || 0),
      notes: raw.notes || '',
      validUntil: raw.validUntil ? new Date(raw.validUntil).toISOString() : null,
      createdAt: this.currentQuoteId
        ? this.quoteService.getQuoteById(this.currentQuoteId)?.createdAt || new Date().toISOString()
        : new Date().toISOString()
    };

    if (this.currentQuoteId) {
      this.quoteService.updateQuote(this.currentQuoteId, quote);
      this.message.success('Cotação actualizada com sucesso!');
    } else {
      this.quoteService.saveQuote(quote);
      this.message.success('Cotação criada com sucesso!');
    }

    this.isSaving = false;
    this.loadQuotes();
    this.closeDrawer();
  }

  editQuote(quote: CarloadQuote): void {
    this.currentQuoteId = quote.id;
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
      customerPhoneNumber: quote.customerPhoneNumber.replace('+258', '').trim(),
      destination: quote.destination,
      discount: quote.discount,
      notes: quote.notes,
      validUntil: quote.validUntil ? this.toDateInput(quote.validUntil) : null,
      subtotal: quote.subtotal,
      total: quote.total
    });

    this.calculateTotals();
  }

  duplicateQuote(quote: CarloadQuote): void {
    this.quoteService.duplicateQuote(quote.id);
    this.loadQuotes();
    this.message.success('Cotação duplicada com sucesso!');
  }

  deleteQuote(quote: CarloadQuote): void {
    this.modal.confirm({
      nzTitle: 'Tens certeza que quer eliminar esta cotação?',
      nzContent: `Cotação: <strong>${quote.quoteCode}</strong> — Cliente: <strong>${quote.customerName}</strong>`,
      nzOkDanger: true,
      nzOkText: 'Sim',
      nzCancelText: 'Não',
      nzOnOk: () => {
        this.quoteService.deleteQuote(quote.id);
        this.loadQuotes();
        this.message.success('Cotação eliminada com sucesso!');
      }
    });
  }

  downloadQuote(quote: CarloadQuote): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const createdDate = new Date(quote.createdAt);
    const validUntilDate = new Date(createdDate);
    validUntilDate.setDate(validUntilDate.getDate() + 7);

    const createdAtFormatted = this.formatDateOnly(createdDate.toISOString());
    const validUntilFormatted = this.formatDateOnly(validUntilDate.toISOString());

    doc.setDrawColor(220, 220, 220);
    doc.setTextColor(40, 40, 40);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('COTAÇÃO', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Transportes Chiziane', pageWidth - 14, 14, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('Bairro Cumbeza km16', pageWidth - 14, 20, { align: 'right' });
    doc.text('Av. de Moçambique 2063', pageWidth - 14, 25, { align: 'right' });
    doc.text('Tel: 845098583 / 879098583', pageWidth - 14, 30, { align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 36, pageWidth - 14, 36);

    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(14, 42, pageWidth - 28, 30, 3, 3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Código:`, 18, 50);
    doc.text(`Data de criação:`, 18, 57);
    doc.text(`Validade:`, 18, 64);

    doc.setFont('helvetica', 'normal');
    doc.text(`${quote.quoteCode}`, 52, 50);
    doc.text(`${createdAtFormatted}`, 52, 57);
    doc.text(`${createdAtFormatted} até ${validUntilFormatted}`, 52, 64);

    doc.roundedRect(14, 78, pageWidth - 28, 34, 3, 3);

    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', 18, 87);
    doc.text('Contacto:', 18, 95);
    doc.text('Destino:', 18, 103);

    doc.setFont('helvetica', 'normal');
    doc.text(quote.customerName || '—', 45, 87);
    doc.text(quote.customerPhoneNumber || '—', 45, 95);
    doc.text(quote.destination || '—', 45, 103);

    autoTable(doc, {
      startY: 120,
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
        fillColor: [0, 123, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 38 },
        3: { halign: 'right', cellWidth: 38 }
      },
      margin: { left: 14, right: 14 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 160;

    const totalsBoxWidth = 72;
    const totalsBoxX = pageWidth - totalsBoxWidth - 14;
    const totalsBoxY = finalY + 10;
    const totalsBoxHeight = 28;

    doc.roundedRect(totalsBoxX, totalsBoxY, totalsBoxWidth, totalsBoxHeight, 3, 3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Subtotal:', totalsBoxX + 4, totalsBoxY + 8);
    doc.text('Desconto:', totalsBoxX + 4, totalsBoxY + 16);
    doc.text('Total:', totalsBoxX + 4, totalsBoxY + 24);

    doc.setFont('helvetica', 'normal');
    doc.text(`${this.formatMoney(quote.subtotal)} Mts`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 8, { align: 'right' });
    doc.text(`${this.formatMoney(quote.discount)} Mts`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 16, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(`${this.formatMoney(quote.total)} Mts`, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 24, { align: 'right' });

    let notesY = totalsBoxY + totalsBoxHeight + 12;

    if (quote.notes) {
      doc.roundedRect(14, notesY, pageWidth - 28, 28, 3, 3);

      doc.setFont('helvetica', 'bold');
      doc.text('Observações:', 18, notesY + 8);

      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(quote.notes, pageWidth - 40);
      doc.text(splitNotes, 18, notesY + 16);
      notesY += 36;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 275, pageWidth - 14, 275);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Documento gerado por Transportes Chiziane', 14, 282);
    doc.text(`Validade da cotação: 7 dias (${createdAtFormatted} até ${validUntilFormatted})`, 14, 287);

    doc.save(`${quote.quoteCode}_${quote.customerName.replace(/\s+/g, '_')}.pdf`);
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
      notes: [''],
      validUntil: [null],
      subtotal: [{ value: 0, disabled: true }],
      total: [{ value: 0, disabled: true }]
    });

    this.quoteForm.get('discount')?.valueChanges.subscribe(() => this.calculateTotals());
  }

  private loadQuotes(): void {
    this.isLoading = true;
    this.allQuotes = this.quoteService.getQuotes();
    this.totalQuotes = this.allQuotes.length;
    this.applyFilters();
    this.isLoading = false;
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
        const createdAt = new Date(quote.createdAt).getTime();
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
    const subtotal = this.items.controls.reduce((sum, item) => {
      const quantity = Number(item.get('quantity')?.value || 0);
      const unitPrice = Number(item.get('unitPrice')?.value || 0);
      return sum + (quantity * unitPrice);
    }, 0);

    const discount = Number(this.quoteForm.get('discount')?.value || 0);
    const total = subtotal - discount;

    this.quoteForm.patchValue({
      subtotal,
      total: total < 0 ? 0 : total
    }, { emitEvent: false });
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
}
