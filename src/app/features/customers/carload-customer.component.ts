import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzModalService} from 'ng-zorro-antd/modal';
import {CarloadCustomer} from '@shared/models/carload-customer';
import {CarloadCustomerService} from '@core/services/carload-customer.service';
import {LocationSuggestion, LocationSuggestionService} from '@core/services/location-suggestion.service';

@Component({
  selector: 'app-carload-customer',
  standalone: false,
  templateUrl: './carload-customer.component.html',
  styleUrls: ['./carload-customer.component.scss']
})
export class CarloadCustomerComponent implements OnInit {
  customers: CarloadCustomer[] = [];
  filteredCustomers: CarloadCustomer[] = [];

  isLoading = false;
  isSaving = false;

  totalCustomers = 0;
  customersWithEmail = 0;
  customersWithoutEmail = 0;

  isDrawerVisible = false;
  searchValue = '';
  currentEditingCustomerId: string | null = null;

  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  editingCustomer?: CarloadCustomer | null = null;
  editingField?: string | null = null;

  customerForm!: FormGroup;
  addressSuggestions: LocationSuggestion[] = [];
  citySuggestions: LocationSuggestion[] = [];

  constructor(
    private customerService: CarloadCustomerService,
    private fb: FormBuilder,
    private locationSuggestionService: LocationSuggestionService,
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

  openDrawer(): void {
    this.isDrawerVisible = true;
    this.currentEditingCustomerId = null;
    this.customerForm.reset();
  }

  closeDrawer(): void {
    this.isDrawerVisible = false;
    this.customerForm.reset();
    this.currentEditingCustomerId = null;
    this.resetInlineEdit();
  }

  editCustomer(customer: CarloadCustomer): void {
    this.currentEditingCustomerId = customer.id;
    this.customerForm.patchValue({...customer});
    this.isDrawerVisible = true;
  }

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
            this.message.success('Cliente eliminado com sucesso!');
          },
          error: () => this.message.error('Erro ao eliminar cliente')
        });
      }
    });
  }

  startInlineEdit(customer: CarloadCustomer, field: string): void {
    if (field === 'customerCode') {
      return;
    }

    this.editingCustomer = {...customer};
    this.editingField = field;
  }

  saveInlineEdit(original: CarloadCustomer, field: string): void {
    if (!this.editingCustomer) return;

    const updated = {...original, [field]: (this.editingCustomer as any)[field]};

    this.customerService.updateCustomer(original.id, updated).subscribe({
      next: () => {
        Object.assign(original, updated);
        this.applySearch();
        this.refreshTotals();
        this.message.success(`Campo ${field} actualizado com sucesso!`);
        this.resetInlineEdit();
      },
      error: () => {
        this.message.error('Erro ao actualizar campo');
        this.resetInlineEdit();
      }
    });
  }

  search(): void {
    this.applySearch();
  }

  onAddressSearch(value: string): void {
    this.addressSuggestions = this.locationSuggestionService.search(value);
  }

  onCitySearch(value: string): void {
    this.citySuggestions = this.locationSuggestionService.searchRegions(value);
  }

  rememberCustomerLocation(): void {
    this.locationSuggestionService.remember(this.customerForm.get('streetAddress')?.value);
    this.locationSuggestionService.remember(this.customerForm.get('city')?.value);
  }

  submitCustomer(): void {
    if (this.customerForm.invalid) {
      this.message.warning('Preencha Nome e Telefone (obrigatórios).');
      return;
    }

    this.isSaving = true;

    const {customerCode, ...customerData}: any = {...this.customerForm.value};
    this.rememberCustomerLocation();

    const rawPhone = (customerData.phoneNumber || '').toString().trim();
    customerData.phoneNumber = rawPhone.startsWith('+258') ? rawPhone : `+258 ${rawPhone}`;

    const request$ = this.currentEditingCustomerId
      ? this.customerService.updateCustomer(this.currentEditingCustomerId, customerData)
      : this.customerService.addCustomer(customerData);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.loadCustomers();
        this.closeDrawer();

        this.message.success(
          this.currentEditingCustomerId
            ? 'Cliente actualizado com sucesso!'
            : 'Cliente criado com sucesso!'
        );
      },
      error: () => {
        this.isSaving = false;
        this.message.error(
          this.currentEditingCustomerId
            ? 'Erro ao actualizar cliente'
            : 'Erro ao criar cliente'
        );
      }
    });
  }

  private applySearch(): void {
    const value = this.searchValue.toLowerCase().trim();

    if (!value) {
      this.filteredCustomers = [...this.customers];
      return;
    }

    this.filteredCustomers = this.customers.filter(customer =>
      (customer.name || '').toLowerCase().includes(value) ||
      (customer.customerCode || '').toLowerCase().includes(value) ||
      (customer.emailAddress || '').toLowerCase().includes(value) ||
      (customer.phoneNumber || '').toLowerCase().includes(value)
    );
  }

  private resetInlineEdit(): void {
    this.editingCustomer = null;
    this.editingField = null;
  }

  private loadCustomers(): void {
    this.isLoading = true;

    this.customerService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers || [];
        this.filteredCustomers = [...this.customers];
        this.refreshTotals();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.message.error('Erro ao carregar clientes');
      }
    });
  }

  private refreshTotals(): void {
    this.totalCustomers = this.customers.length;
    this.customersWithEmail = this.customers.filter(c => !!(c.emailAddress || '').trim()).length;
    this.customersWithoutEmail = this.totalCustomers - this.customersWithEmail;
  }

  private initForm(): void {
    this.customerForm = this.fb.group({
      name: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      nuitNumber: [''],
      streetAddress: [''],
      city: [''],
      zipCode: [''],
      emailAddress: ['']
    });
  }
}
