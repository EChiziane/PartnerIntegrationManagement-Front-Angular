import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { CarloadCustomer } from '../../models/CarloadCustomer';
import { CarloadCustomerService } from '../../services/carload-customer.service';

@Component({
  selector: 'app-carload-customer',
  standalone: false,
  templateUrl: './carload-customer.component.html',
  styleUrl: './carload-customer.component.scss'
})
export class CarloadCustomerComponent implements OnInit {

  customers: CarloadCustomer[] = [];
  isLoading = false;
  isSaving = false;

  // Summary
  totalCustomers = 0;
  customersWithEmail = 0;
  customersWithoutEmail = 0;

  // UI
  isDrawerVisible = false;
  searchValue = '';
  currentEditingCustomerId: string | null = null;

  // Drawer responsive
  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  // Inline edit
  editingCustomer?: CarloadCustomer | null = null;
  editingField?: string | null = null;

  customerForm!: FormGroup;

  // Default fictitious data (sem "Ex.")
  private defaultCustomerData = {
    customerCode: 'CUST001',
    nuitNumber: '123456789',
    streetAddress: 'Rua Principal',
    city: 'Maputo Cidade',
    zipCode: '12345',
    emailAddress: 'customer@gmail.com',
  };

  constructor(
    private customerService: CarloadCustomerService,
    private fb: FormBuilder,
    private message: NzMessageService,
    private modal: NzModalService
  ) {
    this.initForm();
  }

  get drawerTitle(): string {
    return this.currentEditingCustomerId ? 'Editar Cliente' : 'Novo Cliente';
  }

  ngOnInit(): void {
    this.loadCustomers();
    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());
  }

  updateDrawer(): void {
    if (window.innerWidth <= 768) {
      this.drawerWidth = '100%';
      this.drawerPlacement = 'bottom';
    } else {
      this.drawerWidth = 720;
      this.drawerPlacement = 'right';
    }
  }

  onBack(): void {
    window.history.back();
  }

  /* ===================== Drawer ===================== */
  openDrawer(): void {
    this.isDrawerVisible = true;
    this.currentEditingCustomerId = null;
    this.customerForm.reset();
  }

  closeDrawer(): void {
    // ✅ NÃO bloquear o fecho aqui. O botão Cancelar já está desativado no HTML.
    this.isDrawerVisible = false;
    this.customerForm.reset();
    this.currentEditingCustomerId = null;
    this.resetInlineEdit();
  }

  editCustomer(customer: CarloadCustomer): void {
    this.currentEditingCustomerId = customer.id;
    this.customerForm.patchValue({ ...customer });
    this.isDrawerVisible = true;
  }

  /* ===================== Delete ===================== */
  deleteCustomer(customer: CarloadCustomer): void {
    this.modal.confirm({
      nzTitle: 'Tens certeza que quer eliminar este Cliente?',
      nzContent: `Cliente: <strong>${customer.name}</strong>`,
      nzOkText: 'Sim',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Não',
      nzOnOk: () => {
        this.customerService.deleteCustomer(customer.id).subscribe({
          next: () => {
            this.loadCustomers();
            this.message.success('Cliente eliminado com sucesso! 🗑️');
          },
          error: () => this.message.error('Erro ao eliminar cliente 🚫'),
        });
      },
    });
  }

  /* ===================== Inline Edit ===================== */
  startInlineEdit(customer: CarloadCustomer, field: string): void {
    this.editingCustomer = { ...customer };
    this.editingField = field;
  }

  saveInlineEdit(original: CarloadCustomer, field: string): void {
    if (!this.editingCustomer) return;

    const updated = { ...original, [field]: (this.editingCustomer as any)[field] };

    this.customerService.updateCustomer(original.id, updated).subscribe({
      next: () => {
        Object.assign(original, updated);
        this.message.success(`Campo ${field} atualizado! ✅`);
        this.resetInlineEdit();
        this.refreshTotals();
      },
      error: () => {
        this.message.error('Erro ao atualizar campo 🚫');
        this.resetInlineEdit();
      },
    });
  }

  private resetInlineEdit(): void {
    this.editingCustomer = null;
    this.editingField = null;
  }

  /* ===================== Search ===================== */
  search(): void {
    const val = this.searchValue.toLowerCase().trim();

    if (!val) {
      this.loadCustomers();
      return;
    }

    this.customers = this.customers.filter(c =>
      (c.name || '').toLowerCase().includes(val) ||
      (c.customerCode || '').toLowerCase().includes(val) ||
      (c.emailAddress || '').toLowerCase().includes(val) ||
      (c.phoneNumber || '').toLowerCase().includes(val)
    );
  }

  /* ===================== Submit ===================== */
  submitCustomer(): void {
    if (this.customerForm.get('name')?.invalid || this.customerForm.get('phoneNumber')?.invalid) {
      this.message.warning('Preencha Nome e Telefone (obrigatórios).');
      return;
    }

    this.isSaving = true;

    // Copia valores
    const customerData: any = { ...this.customerForm.value };

    // Normalizar telefone para +258
    const rawPhone = (customerData.phoneNumber || '').toString().trim();
    customerData.phoneNumber = rawPhone.startsWith('+258') ? rawPhone : `+258 ${rawPhone}`;

    // Preenche fictícios nos campos vazios
    const keys = Object.keys(this.defaultCustomerData) as Array<keyof typeof this.defaultCustomerData>;
    for (const key of keys) {
      const v = (customerData[key] ?? '').toString().trim();
      if (!v) customerData[key] = this.defaultCustomerData[key];
    }

    const request$ = this.currentEditingCustomerId
      ? this.customerService.updateCustomer(this.currentEditingCustomerId, customerData)
      : this.customerService.addCustomer(customerData);

    request$.subscribe({
      next: () => {
        // ✅ MUITO IMPORTANTE: desligar isSaving ANTES de fechar
        this.isSaving = false;

        // Atualiza lista e fecha drawer
        this.loadCustomers();
        this.closeDrawer();

        this.message.success(
          this.currentEditingCustomerId
            ? 'Cliente atualizado com sucesso! ✅'
            : 'Cliente criado com sucesso! 🎉'
        );
      },
      error: () => {
        this.isSaving = false;
        this.message.error(this.currentEditingCustomerId ? 'Erro ao atualizar cliente 🚫' : 'Erro ao criar cliente 🚫');
      }
    });
  }

  /* ===================== Load ===================== */
  private loadCustomers(): void {
    this.isLoading = true;

    this.customerService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers;
        this.refreshTotals();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.message.error('Erro ao carregar clientes 🚫');
      },
    });
  }

  private refreshTotals(): void {
    this.totalCustomers = this.customers.length;

    this.customersWithEmail = this.customers.filter(c => {
      const e = (c.emailAddress || '').toString().trim();
      return !!e;
    }).length;

    this.customersWithoutEmail = this.totalCustomers - this.customersWithEmail;
  }

  private initForm(): void {
    this.customerForm = this.fb.group({
      name: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      customerCode: [''],
      nuitNumber: [''],
      streetAddress: [''],
      city: [''],
      zipCode: [''],
      emailAddress: [''],
    });
  }
}
