import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {CarloadCustomer} from '@shared/models/carload-customer';
import {CarloadCustomerService} from '@core/services/carload-customer.service';
import {LocationSuggestion, LocationSuggestionService} from '@core/services/location-suggestion.service';
import {TranslationService} from '@core/services/translation.service';
import {ConfirmationDialogService} from '@core/services/confirmation-dialog.service';

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
    private confirmationDialog: ConfirmationDialogService,
    private translationService: TranslationService
  ) {
    this.initForm();
  }

  get drawerTitle(): string {
    return this.currentEditingCustomerId ? this.t('customers.drawer.editTitle') : this.t('customers.drawer.createTitle');
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
    this.confirmationDialog.confirmDelete({
      entity: this.t('common.entities.customer'),
      name: customer.name,
      onOk: () => {
        this.customerService.deleteCustomer(customer.id).subscribe({
          next: () => {
            this.loadCustomers();
            this.message.success(this.t('customers.messages.deleted'));
          },
          error: () => this.message.error(this.t('customers.messages.deleteError'))
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
        this.message.success(this.t('customers.messages.fieldUpdated', {field}));
        this.resetInlineEdit();
      },
      error: () => {
        this.message.error(this.t('customers.messages.fieldError'));
        this.resetInlineEdit();
      }
    });
  }

  search(): void {
    this.applySearch();
  }

  phoneHref(phone: string | null | undefined): string {
    const digits = (phone || '').toString().replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : 'tel:';
  }

  customerAddress(customer: CarloadCustomer): string {
    return [customer.streetAddress, customer.city, customer.zipCode]
      .map(value => (value || '').toString().trim())
      .filter(Boolean)
      .join(', ') || '-';
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
      this.message.warning(this.t('customers.messages.required'));
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
            ? this.t('customers.messages.updated')
            : this.t('customers.messages.created')
        );
      },
      error: () => {
        this.isSaving = false;
        this.message.error(
          this.currentEditingCustomerId
            ? this.t('customers.messages.saveError')
            : this.t('customers.messages.saveError')
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
        this.message.error(this.t('customers.messages.loadError'));
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

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }
}
