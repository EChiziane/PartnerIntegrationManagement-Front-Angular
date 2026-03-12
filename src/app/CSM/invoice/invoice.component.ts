import {Component, OnInit} from '@angular/core';
import {FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {NzModalService} from 'ng-zorro-antd/modal';
import {NzMessageService} from 'ng-zorro-antd/message';

import {CarloadInvoice} from '../../models/CarloadInvoice';
import {CarloadCustomer} from '../../models/CarloadCustomer';

import {CarloadInvoiceService} from '../../services/carload-invoice.service';
import {CarloadCustomerService} from '../../services/carload-customer.service';

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
    'M4_AREIA_GROSSA', 'M4_AREIA_VERMELHA', 'M4_PEDRA_3_4', 'M4_PEDRA_SARRISCA', 'M4_PO_DE_PEDRA', 'M4_AREIA_FINA',
    'M7_AREIA_GROSSA', 'M7_AREIA_VERMELHA', 'M7_PEDRA_3_4', 'M7_PEDRA_SARRISCA', 'M7_PO_DE_PEDRA', 'M7_AREIA_FINA',
    'M18_AREIA_GROSSA', 'M18_AREIA_VERMELHA', 'M18_PEDRA_3_4', 'M18_PEDRA_SARRISCA', 'M18_PO_DE_PEDRA', 'M18_AREIA_FINA',
    'M20_AREIA_GROSSA', 'M20_AREIA_VERMELHA', 'M20_PEDRA_3_4', 'M20_PEDRA_SARRISCA', 'M20_PO_DE_PEDRA', 'M20_AREIA_FINA',
    'M22_AREIA_GROSSA', 'M22_AREIA_VERMELHA', 'M22_PEDRA_3_4', 'M22_PEDRA_SARRISCA', 'M22_PO_DE_PEDRA', 'M22_AREIA_FINA'
  ];

  itemsPrices: { [key: string]: number } = {
    M4_AREIA_GROSSA: 5000,
    M4_AREIA_VERMELHA: 3000,
    M4_PEDRA_3_4: 5500,
    M4_PEDRA_SARRISCA: 5500,
    M4_PO_DE_PEDRA: 4500,
    M4_AREIA_FINA: 4500,

    M7_AREIA_GROSSA: 7500,
    M7_AREIA_VERMELHA: 4000,
    M7_PEDRA_3_4: 8000,
    M7_PEDRA_SARRISCA: 800,
    M7_PO_DE_PEDRA: 7500,
    M7_AREIA_FINA: 6500,

    M18_AREIA_GROSSA: 17000,
    M18_AREIA_VERMELHA: 8000,
    M18_PEDRA_3_4: 18000,
    M18_PEDRA_SARRISCA: 18000,
    M18_PO_DE_PEDRA: 16000,
    M18_AREIA_FINA: 12000,

    M20_AREIA_GROSSA: 20000,
    M20_AREIA_VERMELHA: 9000,
    M20_PEDRA_3_4: 22000,
    M20_PEDRA_SARRISCA: 22000,
    M20_PO_DE_PEDRA: 19000,
    M20_AREIA_FINA: 14000,

    M22_AREIA_VERMELHA: 11000,
    M22_AREIA_GROSSA: 22000,
    M22_PEDRA_3_4: 25000,
    M22_PEDRA_SARRISCA: 25000,
    M22_PO_DE_PEDRA: 22000,
    M22_AREIA_FINA: 16000
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
    this.invoiceService.downloadInvoice(invoice.id).subscribe((fileBlob: Blob) => {
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = invoice.fileName || 'invoice.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    });
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
