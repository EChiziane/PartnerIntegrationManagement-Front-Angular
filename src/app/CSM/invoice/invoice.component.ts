import {Component} from '@angular/core';
import {CarloadInvoice} from '../../models/CarloadInvoice';
import {FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {NzModalService} from 'ng-zorro-antd/modal';
import {NzMessageService} from 'ng-zorro-antd/message';
import {CarloadInvoiceService} from '../../services/carload-invoice.service';
import {CarloadCustomerService} from '../../services/carload-customer.service';
import {CarloadCustomer} from '../../models/CarloadCustomer';

@Component({
  selector: 'app-invoice',
  standalone: false,
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss'
})
export class InvoiceComponent {

  // ===================== PROPRIEDADES =====================
  invoices: CarloadInvoice[] = [];
  allInvoices: CarloadInvoice[] = []; // mantém cópia total para filtros combinados
  dataCustomer: CarloadCustomer[] = [];

  invoiceForm!: FormGroup;
  isDrawerVisible = false;
  currentInvoiceId: string | null = null;
  searchValue = '';

  isLoading = false;

  dateRange: Date[] | null = null;
  selectedCustomerId: string | null = null;

  itemsOptions: string[] = [
    "M4_AREIA_GROSSA", "M4_AREIA_VERMELHA", "M4_PEDRA_3_4", "M4_PEDRA_SARRISCA", "M4_PO_DE_PEDRA", "M4_AREIA_FINA",
    "M7_AREIA_GROSSA", "M7_AREIA_VERMELHA", "M7_PEDRA_3_4", "M7_PEDRA_SARRISCA", "M7_PO_DE_PEDRA", "M7_AREIA_FINA",
    "M18_AREIA_GROSSA", "M18_AREIA_VERMELHA", "M18_PEDRA_3_4", "M18_PEDRA_SARRISCA", "M18_PO_DE_PEDRA", "M18_AREIA_FINA",
    "M20_AREIA_GROSSA", "M20_AREIA_VERMELHA", "M20_PEDRA_3_4", "M20_PEDRA_SARRISCA", "M20_PO_DE_PEDRA", "M20_AREIA_FINA",
    "M22_AREIA_GROSSA", "M22_AREIA_VERMELHA", "M22_PEDRA_3_4", "M22_PEDRA_SARRISCA", "M22_PO_DE_PEDRA", "M22_AREIA_FINA"
  ];

  itemsPrices: { [key: string]: number } = {
    "M4_AREIA_GROSSA": 5000,
    "M4_AREIA_VERMELHA": 3000,
    "M4_PEDRA_3_4": 5500,
    "M4_PEDRA_SARRISCA": 5500,
    "M4_PO_DE_PEDRA": 4500,
    "M4_AREIA_FINA": 4500,
    "M7_AREIA_GROSSA": 7500,
    "M7_AREIA_VERMELHA": 4000,
    "M7_PEDRA_3_4": 8000,
    "M7_PEDRA_SARRISCA": 800,
    "M7_PO_DE_PEDRA": 7500,
    "M7_AREIA_FINA": 6500,
    "M18_AREIA_GROSSA": 17000,
    "M18_AREIA_VERMELHA": 8000,
    "M18_PEDRA_3_4": 18000,
    "M18_PEDRA_SARRISCA": 18000,
    "M18_PO_DE_PEDRA": 16000,
    "M18_AREIA_FINA": 12000,
    "M20_AREIA_GROSSA": 20000,
    "M20_AREIA_VERMELHA": 9000,
    "M20_PEDRA_3_4": 22000,
    "M20_PEDRA_SARRISCA": 22000,
    "M20_PO_DE_PEDRA": 19000,
    "M20_AREIA_FINA": 14000,
    "M22_AREIA_VERMELHA": 11000,
    "M22_AREIA_GROSSA": 22000,
    "M22_PEDRA_3_4": 25000,
    "M22_PEDRA_SARRISCA": 25000,
    "M22_PO_DE_PEDRA": 22000,
    "M22_AREIA_FINA": 16000
  };
  isSaving = false;

  // ===================== CONSTRUTOR =====================
  constructor(
    private fb: FormBuilder,
    private invoiceService: CarloadInvoiceService,
    private customerService: CarloadCustomerService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {
  }

  // ===================== GETTERS =====================
  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  // ===================== CICLO DE VIDA =====================
  ngOnInit(): void {
    this.loadInvoices();
    this.loadCustomers();
    this.initForm();
  }

  // ===================== MANIPULAÇÃO DE ITENS =====================
  addItem() {
    const itemGroup = this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      amount: [{value: 0, disabled: true}]
    });

    itemGroup.get('quantity')?.valueChanges.subscribe(() => this.updateItemAmount(itemGroup));
    itemGroup.get('unitPrice')?.valueChanges.subscribe(() => this.updateItemAmount(itemGroup));

    this.items.push(itemGroup);
  }

  removeItem(index: number) {
    this.items.removeAt(index);
    this.calculateTotals();
  }

  onItemChange(itemName: string, index: number) {
    const itemGroup = this.items.at(index) as FormGroup;
    const price = this.itemsPrices[itemName] || 0;
    itemGroup.patchValue({unitPrice: price, quantity: 1});
    this.updateItemAmount(itemGroup);
  }

  closeDrawer(): void {
    this.isDrawerVisible = false;
    this.invoiceForm.reset({taxRate: 0.16});
    this.items.clear();
    this.currentInvoiceId = null;
  }

  // ===================== CRUD DE INVOICES =====================
  submitInvoice(): void {
    this.isSaving = true;
    if (!this.invoiceForm.valid) return;

    // Reativar temporariamente para incluir no getRawValue()
    this.invoiceForm.get('invoiceCode')?.enable();
    const invoiceData = this.invoiceForm.getRawValue();
    this.invoiceForm.get('invoiceCode')?.disable();

    if (this.currentInvoiceId) {
      // update
      this.invoiceService.updateInvoice(this.currentInvoiceId, invoiceData).subscribe({
        next: () => {
          this.loadInvoices();
          this.isSaving = false; // desativa spinner
          this.closeDrawer();
          this.message.success('Invoice updated ✅');
        },
        error: () => {
          this.message.error('Error updating invoice 🚫');
          this.isSaving = false; // desativa spinner
        }
      });
    } else {
      // create
      this.invoiceService.addInvoice(invoiceData).subscribe({
        next: () => {
          this.loadInvoices();
          this.isSaving = false; // desativa spinner
          this.closeDrawer();
          this.message.success('Invoice created ✅');
        },
        error: () => {
          this.message.error('Error creating invoice 🚫');
          this.isSaving = false; // desativa spinner
        }
      });
    }
  }


  editInvoice(invoice: CarloadInvoice) {
    this.currentInvoiceId = invoice.id;
    this.isDrawerVisible = true;

    this.items.clear();
    invoice.items.forEach(it => {
      const group = this.fb.group({
        description: [it.description, Validators.required],
        quantity: [it.quantity, Validators.required],
        unitPrice: [it.unitPrice, Validators.required],
        amount: [{value: it.quantity * it.unitPrice, disabled: true}]
      });
      group.get('quantity')?.valueChanges.subscribe(() => this.updateItemAmount(group));
      group.get('unitPrice')?.valueChanges.subscribe(() => this.updateItemAmount(group));
      this.items.push(group);
    });

    this.invoiceForm.patchValue({
      carloadCustomerId: invoice.carloadCustomerId,
      invoiceCode: invoice.invoiceCode,
      taxRate: invoice.taxRate
    });

    this.calculateTotals();
  }

  deleteInvoice(invoice: CarloadInvoice) {
    this.modal.confirm({
      nzTitle: 'Are you sure you want to delete this invoice?',
      nzContent: `<b>${invoice.invoiceCode}</b>`,
      nzOkText: 'Yes',
      nzCancelText: 'No',
      nzOnOk: () => {
        this.invoiceService.deleteInvoice(invoice.id).subscribe({
          next: () => {
            this.loadInvoices();
            this.message.success('Invoice deleted 🗑️');
          },
          error: () => this.message.error('Error deleting invoice 🚫')
        });
      }
    });
  }


  // ===================== DOWNLOAD =====================
  downloadInvoice(invoice: CarloadInvoice) {
    this.invoiceService.downloadRecibo(invoice.id).subscribe((fileBlob: Blob) => {
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = invoice.fileName || 'invoice.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  onCustomerChange(value: string | null): void {
    this.selectedCustomerId = value; // garante que a variável está atualizada
    this.applyFilters();
  }

  openDrawer(): void {
    this.isDrawerVisible = true;
    this.currentInvoiceId = null;
    this.invoiceForm.reset({taxRate: 0.16});
    this.items.clear();
    this.addItem();

    // Gerar o próximo código automaticamente
    const nextCode = this.generateNextInvoiceCode();

    // Preencher o campo no formulário e torná-lo não editável
    this.invoiceForm.patchValue({invoiceCode: nextCode.toString()});
    this.invoiceForm.get('invoiceCode')?.disable();
  }

  applyFilters(): void {
    let filtered = [...this.allInvoices];

    // Filtro por cliente
    if (this.selectedCustomerId) {
      filtered = filtered.filter(inv => inv.carloadCustomerId === this.selectedCustomerId);
    }

    // Filtro por intervalo de datas
    if (this.dateRange && this.dateRange.length === 2) {
      const [start, end] = this.dateRange;
      const startDate = new Date(start).setHours(0, 0, 0, 0);
      const endDate = new Date(end).setHours(23, 59, 59, 999);
      filtered = filtered.filter(inv => {
        const createdAt = new Date(inv.createdAt).getTime();
        return createdAt >= startDate && createdAt <= endDate;
      });
    }

    // Filtro de pesquisa
    const val = this.searchValue.toLowerCase();
    if (val) {
      filtered = filtered.filter(inv =>
        inv.invoiceCode.toLowerCase().includes(val) ||
        inv.items.some((it: any) => it.description.toLowerCase().includes(val))
      );
    }

    this.invoices = filtered;
  }

  filterByCustomer(): void {
    this.applyFilters();
  }

  filterByDateRange(): void {
    this.applyFilters();
  }

  search(): void {
    this.applyFilters();
  }

  // ===================== INICIALIZAÇÃO =====================
  private initForm() {
    this.invoiceForm = this.fb.group({
      carloadCustomerId: ['', Validators.required],
      invoiceCode: ['', Validators.required],
      items: this.fb.array([]),
      taxRate: [0.1, Validators.required],
      subtotal: [{value: 0, disabled: true}],
      tax: [{value: 0, disabled: true}],
      total: [{value: 0, disabled: true}]
    });

    this.invoiceForm.get('taxRate')?.valueChanges.subscribe(() => this.calculateTotals());
  }

  private loadInvoices() {
    this.isLoading = true;
    this.invoiceService.getInvoices().subscribe(data => {
      this.invoices = data;
      this.allInvoices = data;
      this.isLoading = false;
    });
  }

  // ===================== GERAÇÃO DE CÓDIGO =====================
  private generateNextInvoiceCode(): number {
    if (!this.allInvoices || this.allInvoices.length === 0) {
      return 1001; // primeiro código
    }

    // Extrai o número mais alto existente
    const lastCode = Math.max(
      ...this.allInvoices.map(inv => Number(inv.invoiceCode) || 0)
    );

    // Incrementa e devolve o próximo
    return lastCode + 1;
  }

  private loadCustomers() {
    this.customerService.getCustomers().subscribe(data => this.dataCustomer = data);
  }

  private updateItemAmount(itemGroup: FormGroup) {
    const quantity = itemGroup.get('quantity')?.value || 0;
    const unitPrice = itemGroup.get('unitPrice')?.value || 0;
    const amount = quantity * unitPrice;
    itemGroup.patchValue({amount}, {emitEvent: false});
    this.calculateTotals();
  }

  private calculateTotals() {
    const subtotal = this.items.controls.reduce((sum, item) => {
      const amount = item.get('amount')?.value || 0;
      return sum + amount;
    }, 0);
    const taxRate = this.invoiceForm.get('taxRate')?.value || 0;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    this.invoiceForm.patchValue({subtotal, tax, total}, {emitEvent: false});
  }


}
