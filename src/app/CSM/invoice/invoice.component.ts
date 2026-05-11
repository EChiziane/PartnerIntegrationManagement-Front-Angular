import {Component, OnInit} from '@angular/core';
import {FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {NzModalService} from 'ng-zorro-antd/modal';
import {NzMessageService} from 'ng-zorro-antd/message';

import {CarloadInvoice} from '../../models/CarloadInvoice';
import {CarloadCustomer} from '../../models/CarloadCustomer';

import {CarloadInvoiceService} from '../../services/carload-invoice.service';
import {CarloadCustomerService} from '../../services/carload-customer.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  isLoading = false;
  isSaving = false;

  isDrawerVisible = false;

  searchValue = '';
  dateRange: Date[] | null = null;
  selectedCustomerId: string | null = null;

  totalInvoices = 0;
  totalCustomers = 0;

  drawerWidth: string | number = 1000;
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
    private modal: NzModalService
  ) {
  }

  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadInvoices();
    this.loadCustomers();

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

  onCustomerChange(value: string | null): void {
    this.selectedCustomerId = value;
    this.applyFilters();
  }

  filterByDateRange(): void {
    this.applyFilters();
  }

  search(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchValue = '';
    this.selectedCustomerId = null;
    this.dateRange = null;
    this.applyFilters();
  }

  openDrawer(): void {
    this.isDrawerVisible = true;

    this.invoiceForm.reset({
      carloadCustomerId: '',
      taxRate: 0.16,
      subtotal: 0,
      tax: 0,
      total: 0
    });

    this.items.clear();
    this.addItem();

    const nextCode = this.generateNextInvoiceCode();
    this.invoiceForm.patchValue({invoiceCode: nextCode.toString()});
    this.invoiceForm.get('invoiceCode')?.disable({emitEvent: false});
  }

  closeDrawer(): void {
    if (this.isSaving) return;

    this.isDrawerVisible = false;

    this.invoiceForm.reset({
      taxRate: 0.16,
      subtotal: 0,
      tax: 0,
      total: 0
    });

    this.items.clear();
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

  submitInvoice(): void {
    if (this.invoiceForm.invalid) {
      this.message.warning('Preencha os campos obrigatórios.');
      return;
    }

    this.isSaving = true;

    this.invoiceForm.get('invoiceCode')?.enable({emitEvent: false});
    const invoiceData = this.invoiceForm.getRawValue();
    this.invoiceForm.get('invoiceCode')?.disable({emitEvent: false});

    this.invoiceService.addInvoice(invoiceData).subscribe({
      next: () => {
        this.isSaving = false;
        this.loadInvoices();
        this.closeDrawer();
        this.message.success('Fatura criada com sucesso! ✅');
      },
      error: () => {
        this.isSaving = false;
        this.message.error('Erro ao criar fatura 🚫');
      }
    });
  }

  deleteInvoice(invoice: CarloadInvoice): void {
    this.modal.confirm({
      nzTitle: 'Tens certeza que quer eliminar esta fatura?',
      nzContent: `<b>${invoice.invoiceCode}</b>`,
      nzOkText: 'Sim',
      nzCancelText: 'Não',
      nzOkDanger: true,
      nzOnOk: () => {
        this.invoiceService.deleteInvoice(invoice.id).subscribe({
          next: () => {
            this.loadInvoices();
            this.message.success('Fatura eliminada com sucesso! 🗑️');
          },
          error: () => this.message.error('Erro ao eliminar fatura 🚫')
        });
      }
    });
  }

  downloadInvoice(invoice: CarloadInvoice): void {
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
    doc.text('TC', 23, 21, {align: 'center'});
    doc.setFontSize(18);
    doc.text('FATURA', 38, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Documento comercial', 38, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Transportes Chiziane', pageWidth - 14, 14, {align: 'right'});

    doc.setFont('helvetica', 'normal');
    doc.text('Bairro Cumbe km16', pageWidth - 14, 20, {align: 'right'});
    doc.text('Av. de Moçambique 2063', pageWidth - 14, 25, {align: 'right'});
    doc.text('Tel: 845098583 / 879985279', pageWidth - 14, 30, {align: 'right'});

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
      head: [['Item', 'Qtd', 'Preço Unit.', 'Subtotal']],
      body: invoice.items.map(item => [
        this.getItemLabel(item.description),
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
        1: {halign: 'center', cellWidth: 20},
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
    doc.text('Documento gerado por Transportes Chiziane', 14, 282);
    doc.text(`Fatura emitida em ${createdAtFormatted}`, 14, 287);

    doc.save(`fatura_${invoice.invoiceCode}_${(invoice.carloadCustomerName || 'cliente').replace(/\s+/g, '_')}.pdf`);
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
        (inv.items || []).some(it => (it.description || '').toLowerCase().includes(val))
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

  private calculateTotals(): void {
    const subtotal = this.items.controls.reduce((sum, item) => {
      const amount = Number(item.get('amount')?.value || 0);
      return sum + amount;
    }, 0);

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
        this.message.error('Erro ao carregar faturas 🚫');
      }
    });
  }

  private loadCustomers(): void {
    this.customerService.getCustomers().subscribe({
      next: data => {
        this.dataCustomer = data || [];
        this.totalCustomers = this.dataCustomer.length;
      },
      error: () => this.message.error('Erro ao carregar clientes 🚫')
    });
  }

  private generateNextInvoiceCode(): number {
    if (!this.allInvoices || this.allInvoices.length === 0) {
      return 1001;
    }

    const lastCode = Math.max(...this.allInvoices.map(inv => Number(inv.invoiceCode) || 0));
    return lastCode + 1;
  }
}
