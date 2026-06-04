import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';

import {CarLoad, CarLoadStatus, CarloadType} from '@shared/models/carload';
import {CarloadService} from '@core/services/carload.service';

import {Driver} from '@shared/models/driver';
import {Sprint} from '@shared/models/sprint';
import {CarloadCustomer} from '@shared/models/carload-customer';
import {Truck} from '@shared/models/truck';

import {DriverService} from '@core/services/driver.service';
import {SprintService} from '@core/services/sprint.service';
import {CarloadCustomerService} from '@core/services/carload-customer.service';
import {TruckService} from '@core/services/truck.service';
import {LocationSuggestion, LocationSuggestionService} from '@core/services/location-suggestion.service';
import {CarloadListPdfService} from '@core/services/carload-list-pdf.service';
import {TranslationService} from '@core/services/translation.service';
import {ConfirmationDialogService} from '@core/services/confirmation-dialog.service';
import {ProductPriceService} from '@core/services/product-price.service';
import {ProductPrice} from '@shared/models/product-price';

type FilterMode = 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
type CustomerMode = 'NEW' | 'EXISTING';
type CarloadReportMode = 'LATEST' | 'PRESET' | 'PERIOD' | 'ALL';
type CarloadReportPreset = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30_DAYS';

@Component({
  selector: 'app-carload',
  standalone: false,
  templateUrl: './carload.component.html',
  styleUrls: ['./carload.component.scss']
})
export class CarLoadComponent implements OnInit {
  dataSource: CarLoad[] = [];
  listOfDisplayData: CarLoad[] = [];

  isLoading = false;
  isSaving = false;

  totalCarLoads = 0;
  scheduled = 0;
  inProgress = 0;
  delivered = 0;

  drivers: Driver[] = [];
  trucks: Truck[] = [];
  sprints: Sprint[] = [];
  customers: CarloadCustomer[] = [];
  productPrices: ProductPrice[] = [];
  destinationSuggestions: LocationSuggestion[] = [];
  isLoadingLookups = false;

  searchValue = '';
  visible = false;
  isCarLoadDrawerVisible = false;
  isReportDrawerVisible = false;

  filterMode: FilterMode = 'ALL';

  isEditMode = false;
  isCopyMode = false;
  selectedCarLoadId: string | null = null;

  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  customerMode: CustomerMode = 'NEW';

  reportForm = new FormGroup({
    mode: new FormControl<CarloadReportMode>('LATEST', Validators.required),
    preset: new FormControl<CarloadReportPreset>('THIS_MONTH'),
    limit: new FormControl(30, [Validators.required, Validators.min(1)]),
    startDate: new FormControl<string | null>(null),
    endDate: new FormControl<string | null>(null)
  });

  materials: string[] = [
    'Areia grossa',
    'Areia vermelha',
    'Areia fina',
    'Pedra 3/4',
    'Pedra enrocamento',
    'Pedra sarrisca'
  ];

  carLoadForm = new FormGroup({
    customerId: new FormControl<string | null>(null),
    customerName: new FormControl(''),
    customerPhoneNumber: new FormControl('', [Validators.required, Validators.pattern('^[+0-9 ]+$')]),

    deliveryDestination: new FormControl('', Validators.required),
    transportedMaterial: new FormControl('', Validators.required),
    quantity: new FormControl<number | null>(1, [Validators.min(1)]),
    truckSize: new FormControl(''),

    logisticsManagerId: new FormControl<string | null>(null),
    assignedDriverId: new FormControl('', Validators.required),
    assignedTruckId: new FormControl<string | null>(null),
    carloadBatchId: new FormControl('', Validators.required),

    totalSpent: new FormControl(0, [Validators.required, Validators.min(0)]),
    totalEarnings: new FormControl(0, [Validators.required, Validators.min(0)]),
    customerPrice: new FormControl(0, [Validators.min(0)]),
    driverAmount: new FormControl(0, [Validators.min(0)]),
    companyCommission: new FormControl(0),

    carloadType: new FormControl<CarloadType>('Produced', Validators.required),
    deliveryStatus: new FormControl<CarLoadStatus>('SCHEDULED', Validators.required),

    deliveryScheduledDate: new FormControl<string | null>(''),
    deliveryDate: new FormControl<string | null>(''),
  });

  constructor(
    private carLoadService: CarloadService,
    private driverService: DriverService,
    private truckService: TruckService,
    private sprintService: SprintService,
    private customerService: CarloadCustomerService,
    private locationSuggestionService: LocationSuggestionService,
    private carloadListPdfService: CarloadListPdfService,
    private productPriceService: ProductPriceService,
    private message: NzMessageService,
    private confirmationDialog: ConfirmationDialogService,
    private translationService: TranslationService
  ) {
  }

  get selectedStatusUpper(): string {
    return (this.carLoadForm.get('deliveryStatus')?.value || 'SCHEDULED').toString().toUpperCase();
  }

  get selectedCarloadType(): string {
    return (this.carLoadForm.get('carloadType')?.value || 'Produced').toString();
  }

  get shouldShowScheduledDate(): boolean {
    return this.selectedStatusUpper === 'SCHEDULED';
  }

  get shouldShowDeliveredDate(): boolean {
    return this.selectedStatusUpper === 'DELIVERED';
  }

  get hasActiveFilters(): boolean {
    return this.filterMode !== 'ALL' || !!this.searchValue.trim();
  }

  get isAdminUser(): boolean {
    return this.getCurrentUserRole() === 'ADMIN';
  }

  get availableSprints(): Sprint[] {
    const selectedSprintId = this.carLoadForm.get('carloadBatchId')?.value;

    return (this.sprints || []).filter(sprint => {
      return this.isSprintInProgress(sprint) || sprint.id === selectedSprintId;
    });
  }
  private isSprintInProgress(sprint: Sprint): boolean {
    return (sprint.status || '').toUpperCase() === 'EM_EXECUCAO';
  }

  ngOnInit(): void {
    this.getCarLoads();
    this.loadLookups();

    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());

    this.carLoadForm.get('deliveryStatus')!.valueChanges.subscribe(() => {
      this.applyDateRulesByStatus();
    });

    this.carLoadForm.get('customerId')!.valueChanges.subscribe(value => {
      if (this.customerMode === 'EXISTING' && value) {
        this.fillCustomerFromSelection(value);
      }
    });

    this.carLoadForm.get('assignedDriverId')!.valueChanges.subscribe(value => {
      this.applyDriverTruckSelection(value || null);
    });

    this.carLoadForm.get('transportedMaterial')!.valueChanges.subscribe(() => this.applyCatalogPrice());
    this.carLoadForm.get('truckSize')!.valueChanges.subscribe(() => this.applyCatalogPrice());

    this.applyDateRulesByStatus();
    this.applyCustomerModeRules();
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

  setCustomerMode(mode: CustomerMode): void {
    this.customerMode = mode;

    if (mode === 'EXISTING') {
      this.carLoadForm.patchValue({
        customerId: null,
        customerName: '',
        customerPhoneNumber: ''
      });
    } else {
      this.carLoadForm.patchValue({
        customerId: null
      });
    }

    this.applyCustomerModeRules();
  }

  getStatusLabel(status: CarLoadStatus): string {
    switch ((status || '').toUpperCase()) {
      case 'SCHEDULED':
        return this.t('dashboard.status.scheduled');
      case 'IN_PROGRESS':
        return this.t('dashboard.status.progress');
      case 'DELIVERED':
        return this.t('dashboard.status.delivered');
      case 'CANCELLED':
        return this.t('dashboard.status.cancelled');
      default:
        return status as string;
    }
  }

  isDelivered(status: CarLoadStatus): boolean {
    return (status || '').toUpperCase() === 'DELIVERED';
  }

  get carLoadDrawerTitle(): string {
    if (this.isCopyMode) {
      return this.t('carloads.drawer.copyTitle');
    }

    return this.isEditMode
      ? this.t('carloads.drawer.editTitle')
      : this.t('carloads.drawer.createTitle');
  }

  get selectedDriverTruckLabel(): string {
    const truck = this.selectedDriverTruck;
    if (!truck) {
      return 'Sem camiao associado ao motorista';
    }

    const plate = truck.plateNumber || truck.description || 'Camiao sem matricula';
    const size = truck.truckSize ? ` - ${truck.truckSize}` : '';
    return `${plate}${size}`;
  }

  get selectedDriverTruck(): Truck | null {
    const driverId = this.carLoadForm.get('assignedDriverId')?.value;
    if (!driverId) {
      return null;
    }

    return this.trucks.find(item => item.assignedDriverId === driverId) || null;
  }


  getStatusColor(status: CarLoadStatus): string {
    switch ((status || '').toUpperCase()) {
      case 'DELIVERED':
        return 'green';
      case 'IN_PROGRESS':
        return 'blue';
      case 'CANCELLED':
        return 'red';
      default:
        return 'orange';
    }
  }

  getStatusClass(status: CarLoadStatus): string {
    return `status-${(status || 'SCHEDULED').toString().toLowerCase().replace('_', '-')}`;
  }

  getAvailableStatusTransitions(carload: CarLoad): CarLoadStatus[] {
    if (this.isAdminUser) {
      return ['SCHEDULED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']
        .filter(status => status !== carload.deliveryStatus) as CarLoadStatus[];
    }

    switch ((carload.deliveryStatus || '').toUpperCase()) {
      case 'SCHEDULED':
        return ['IN_PROGRESS', 'DELIVERED', 'CANCELLED'];
      case 'IN_PROGRESS':
        return ['DELIVERED', 'CANCELLED'];
      default:
        return [];
    }
  }

  canChangeStatus(carload: CarLoad): boolean {
    return this.getAvailableStatusTransitions(carload).length > 0;
  }

  phoneHref(phone: string | null | undefined): string {
    const digits = (phone || '').toString().replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : 'tel:';
  }

  onQuickStatusChange(carload: CarLoad, status: CarLoadStatus): void {
    if (!carload?.id || !status || status === carload.deliveryStatus) {
      return;
    }

    if (!this.getAvailableStatusTransitions(carload).includes(status)) {
      this.message.warning('Este estado ja esta fechado e nao permite alteracao.');
      return;
    }

    const now = this.normalizeDateTimeLocal(new Date().toISOString().substring(0, 16));
    const payload = {
      deliveryStatus: status,
      deliveryScheduledDate: status === 'SCHEDULED'
        ? (carload.deliveryScheduledDate || now)
        : carload.deliveryScheduledDate,
      deliveryDate: status === 'DELIVERED' ? now : null
    };

    this.carLoadService.updateCarLoadStatus(carload.id, payload).subscribe({
      next: updated => {
        this.dataSource = this.dataSource.map(item => item.id === updated.id ? updated : item);
        this.calculateStats();
        this.applyFilters();
        this.message.success(`Estado atualizado para ${this.getStatusLabel(status)}.`);
      },
      error: () => this.message.error('Erro ao atualizar estado da carrada.')
    });
  }

  loadLookups(): void {
    this.isLoadingLookups = true;

    this.driverService.getDrivers().subscribe({
      next: data => (this.drivers = data || []),
      error: () => this.message.error(this.t('carloads.messages.loadDriversError'))
    });

    this.truckService.getTrucks().subscribe({
      next: data => (this.trucks = data || []),
      error: () => this.message.error('Erro ao carregar camioes.')
    });

    this.sprintService.getSprints().subscribe({
      next: data => (this.sprints = data || []),
      error: () => this.message.error(this.t('carloads.messages.loadSprintsError'))
    });

    this.customerService.getCustomers().subscribe({
      next: data => (this.customers = data || []),
      error: () => this.message.error(this.t('carloads.messages.loadCustomersError'))
    });

    this.productPriceService.getActivePrices().subscribe({
      next: data => {
        this.productPrices = data || [];
        this.materials = Array.from(new Set(this.productPrices.map(item => item.materialName))).sort();
      },
      error: () => this.message.warning('Catalogo de precos indisponivel. A usar materiais locais.')
    });

    setTimeout(() => (this.isLoadingLookups = false), 500);
  }

  getCarLoads(): void {
    this.isLoading = true;
    this.carLoadService.getCarLoads().subscribe({
      next: data => {
        this.dataSource = data || [];
        this.listOfDisplayData = [...this.dataSource];
        this.calculateStats();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.message.error(this.t('carloads.messages.loadError'));
        this.isLoading = false;
      }
    });
  }

  calculateStats(): void {
    this.totalCarLoads = this.dataSource.length;
    this.scheduled = this.dataSource.filter(c => c.deliveryStatus === 'SCHEDULED').length;
    this.inProgress = this.dataSource.filter(c => c.deliveryStatus === 'IN_PROGRESS').length;
    this.delivered = this.dataSource.filter(c => c.deliveryStatus === 'DELIVERED').length;
  }

  setFilterMode(mode: FilterMode): void {
    this.filterMode = mode;
    this.applyFilters();
  }

  applyFilters(): void {
    let data = [...this.dataSource];

    if (this.filterMode !== 'ALL') {
      const mode = this.filterMode.toUpperCase();
      data = data.filter(item => (item.deliveryStatus || '').toUpperCase() === mode);
    }

    if (this.searchValue) {
      const value = this.searchValue.toLowerCase();
      data = data.filter(item =>
        (item.customerName || '').toLowerCase().includes(value) ||
        (item.customerPhoneNumber || '').toLowerCase().includes(value) ||
        (item.deliveryDestination || '').toLowerCase().includes(value) ||
        (item.transportedMaterial || '').toLowerCase().includes(value) ||
        (item.assignedDriverName || '').toLowerCase().includes(value) ||
        (item.logisticsManagerName || '').toLowerCase().includes(value) ||
        (item.carloadBatchName || '').toLowerCase().includes(value)
      );
    }

    this.listOfDisplayData = data;
  }

  search(): void {
    this.visible = false;
    this.applyFilters();
  }

  onDeliveryDestinationSearch(value: string): void {
    this.destinationSuggestions = this.locationSuggestionService.search(value);
  }

  rememberDeliveryDestination(): void {
    this.locationSuggestionService.remember(this.carLoadForm.get('deliveryDestination')?.value);
  }

  reset(): void {
    this.searchValue = '';
    this.filterMode = 'ALL';
    this.search();
  }

  openReportDrawer(): void {
    this.reportForm.reset({
      mode: 'LATEST',
      preset: 'THIS_MONTH',
      limit: 30,
      startDate: null,
      endDate: null
    });
    this.isReportDrawerVisible = true;
  }

  closeReportDrawer(): void {
    this.isReportDrawerVisible = false;
  }

  generateCarloadReport(): void {
    const mode = this.reportForm.value.mode || 'LATEST';
    const carloads = this.getReportCarloads(mode);

    if (!carloads.length) {
      this.message.warning(this.t('carloads.messages.emptyReport'));
      return;
    }

    this.carloadListPdfService.downloadCarloadListReport(carloads, this.getReportScopeLabel(mode));
    this.closeReportDrawer();
  }

  openCarLoadDrawer(): void {
    this.isEditMode = false;
    this.isCopyMode = false;
    this.selectedCarLoadId = null;
    this.customerMode = 'NEW';

    this.carLoadForm.reset({
      customerId: null,
      customerName: '',
      customerPhoneNumber: '',
      deliveryDestination: '',
      transportedMaterial: '',
      quantity: 1,
      truckSize: '',
      logisticsManagerId: null,
      assignedDriverId: '',
      assignedTruckId: null,
      carloadBatchId: '',
      totalSpent: 0,
      totalEarnings: 0,
      customerPrice: 0,
      driverAmount: 0,
      companyCommission: 0,
      carloadType: 'Produced',
      deliveryStatus: 'SCHEDULED',
      deliveryScheduledDate: '',
      deliveryDate: ''
    });

    if (!this.drivers.length || !this.trucks.length || !this.sprints.length || !this.customers.length) {
      this.loadLookups();
    }

    this.isCarLoadDrawerVisible = true;
    this.applyDateRulesByStatus();
    this.applyCustomerModeRules();
  }

  closeCarLoadDrawer(): void {
    this.isCarLoadDrawerVisible = false;
    this.carLoadForm.reset();
    this.selectedCarLoadId = null;
    this.isEditMode = false;
    this.isCopyMode = false;
    this.customerMode = 'NEW';
  }

  editCarLoad(carload: CarLoad): void {
    this.isEditMode = true;
    this.isCopyMode = false;
    this.selectedCarLoadId = carload.id;

    if (!this.drivers.length || !this.trucks.length || !this.sprints.length || !this.customers.length) {
      this.loadLookups();
    }

    this.customerMode = carload.customerId ? 'EXISTING' : 'NEW';

    this.isCarLoadDrawerVisible = true;
    this.carLoadForm.patchValue(this.mapCarloadToForm(carload));
    this.applyDateRulesByStatus();
    this.applyCustomerModeRules();
  }

  copyCarLoad(carload: CarLoad): void {
    this.isEditMode = false;
    this.isCopyMode = true;
    this.selectedCarLoadId = null;

    if (!this.drivers.length || !this.trucks.length || !this.sprints.length || !this.customers.length) {
      this.loadLookups();
    }

    this.customerMode = carload.customerId ? 'EXISTING' : 'NEW';

    this.isCarLoadDrawerVisible = true;
    this.carLoadForm.patchValue(this.mapCarloadToForm(carload));
    this.carLoadForm.patchValue({
      deliveryStatus: 'SCHEDULED',
      deliveryScheduledDate: '',
      deliveryDate: ''
    });

    this.applyDateRulesByStatus();
    this.applyCustomerModeRules();
  }

  saveCarLoad(): void {
    this.applyDateRulesByStatus();
    this.applyCustomerModeRules();

    if (this.carLoadForm.invalid) {
      this.markFormGroupTouched(this.carLoadForm);
      this.message.warning(this.t('carloads.messages.required'));
      return;
    }

    this.isSaving = true;

    const formData: any = {...this.carLoadForm.value};
    this.locationSuggestionService.remember(formData.deliveryDestination);

    formData.driverAmount = Number(formData.totalSpent ?? formData.driverAmount ?? 0);
    formData.customerPrice = Number(formData.totalEarnings ?? formData.customerPrice ?? 0);
    formData.companyCommission = formData.customerPrice - formData.driverAmount;
    formData.totalSpent = formData.driverAmount;
    formData.totalEarnings = formData.customerPrice;

    const rawPhone = (formData.customerPhoneNumber || '').toString().trim();
    formData.customerPhoneNumber = rawPhone
      ? (rawPhone.startsWith('+258') ? rawPhone : `+258 ${rawPhone}`)
      : null;

    formData.deliveryStatus = (formData.deliveryStatus || 'SCHEDULED').toString().toUpperCase();
    formData.carloadType = formData.carloadType || 'Produced';

    if (this.customerMode === 'EXISTING') {
      const selectedCustomer = this.customers.find(c => c.id === formData.customerId);
      if (selectedCustomer) {
        formData.customerName = selectedCustomer.name;
        formData.customerPhoneNumber = selectedCustomer.phoneNumber;
      }
    } else {
      formData.customerId = null;
    }

    formData.logisticsManagerId = null;

    if (formData.deliveryStatus === 'CANCELLED' || formData.deliveryStatus === 'IN_PROGRESS') {
      formData.deliveryScheduledDate = this.normalizeDateTimeLocal(formData.deliveryScheduledDate);
      formData.deliveryDate = null;
    }

    if (formData.deliveryStatus === 'SCHEDULED') {
      formData.deliveryScheduledDate = this.normalizeDateTimeLocal(formData.deliveryScheduledDate);
      formData.deliveryDate = null;
    }

    if (formData.deliveryStatus === 'DELIVERED') {
      formData.deliveryDate = this.normalizeDateTimeLocal(formData.deliveryDate);
      formData.deliveryScheduledDate = this.normalizeDateTimeLocal(formData.deliveryScheduledDate);
      if (!formData.deliveryScheduledDate) {
        formData.deliveryScheduledDate = null;
      }
    }

    const isUpdate = this.isEditMode && this.selectedCarLoadId;
    const request$ = isUpdate
      ? this.carLoadService.updateCarLoad(this.selectedCarLoadId!, formData)
      : this.carLoadService.addCarLoad(formData);

    request$.subscribe({
      next: () => {
        this.getCarLoads();
        this.closeCarLoadDrawer();

        if (isUpdate) {
          this.message.success(this.t('carloads.messages.updated'));
        } else if (this.isCopyMode) {
          this.message.success(this.t('carloads.messages.copied'));
        } else {
          this.message.success(this.t('carloads.messages.created'));
        }

        this.isSaving = false;
      },
      error: () => {
        this.message.error(this.t('carloads.messages.saveError'));
        this.isSaving = false;
      }
    });
  }

  deleteCarLoad(data: CarLoad): void {
    this.confirmationDialog.confirmDelete({
      entity: this.t('common.entities.carload'),
      name: data.sourceQuoteCode || data.invoiceCode || data.customerName,
      details: this.t('common.confirmation.deleteCarloadContent', {customer: data.customerName, destination: data.deliveryDestination}),
      onOk: () =>
        this.carLoadService.deleteCarLoad(data.id).subscribe({
          next: () => {
            this.getCarLoads();
            this.message.success(this.t('carloads.messages.deleted'));
          },
          error: () => this.message.error(this.t('carloads.messages.deleteError'))
        })
    });
  }

  onBack(): void {
    window.history.back();
  }

  private applyCustomerModeRules(): void {
    const customerNameCtrl = this.carLoadForm.get('customerName')!;
    const customerPhoneCtrl = this.carLoadForm.get('customerPhoneNumber')!;
    const customerIdCtrl = this.carLoadForm.get('customerId')!;

    if (this.customerMode === 'EXISTING') {
      customerIdCtrl.setValidators([Validators.required]);
      customerNameCtrl.clearValidators();
      customerPhoneCtrl.clearValidators();
    } else {
      customerIdCtrl.clearValidators();
      customerNameCtrl.clearValidators();
      customerPhoneCtrl.setValidators([Validators.required, Validators.pattern('^[+0-9 ]+$')]);
    }

    customerIdCtrl.updateValueAndValidity({emitEvent: false});
    customerNameCtrl.updateValueAndValidity({emitEvent: false});
    customerPhoneCtrl.updateValueAndValidity({emitEvent: false});
  }

  private fillCustomerFromSelection(customerId: string): void {
    const customer = this.customers.find(c => c.id === customerId);
    if (!customer) return;

    this.carLoadForm.patchValue({
      customerName: customer.name,
      customerPhoneNumber: customer.phoneNumber?.replace('+258', '').trim() || customer.phoneNumber
    }, {emitEvent: false});
  }

  private applyDriverTruckSelection(driverId: string | null): void {
    if (!driverId) {
      this.carLoadForm.patchValue({
        assignedTruckId: null,
        truckSize: ''
      }, {emitEvent: false});
      return;
    }

    const truck = this.trucks.find(item => item.assignedDriverId === driverId);
    if (!truck) {
      this.carLoadForm.patchValue({
        assignedTruckId: null,
        truckSize: ''
      }, {emitEvent: false});
      return;
    }

    this.carLoadForm.patchValue({
      assignedTruckId: truck.id,
      truckSize: truck.truckSize || ''
    }, {emitEvent: false});
    this.applyCatalogPrice();
  }

  private applyCatalogPrice(): void {
    const material = this.carLoadForm.get('transportedMaterial')?.value || '';
    const truckSize = this.carLoadForm.get('truckSize')?.value || '';
    const price = this.findCatalogPrice(truckSize, material);

    if (!price) {
      return;
    }

    const salePrice = Number(price.salePrice || 0);
    const driverCost = Number(price.driverCost || 0);

    this.carLoadForm.patchValue({
      totalEarnings: salePrice,
      customerPrice: salePrice,
      totalSpent: driverCost,
      driverAmount: driverCost,
      companyCommission: salePrice - driverCost
    }, {emitEvent: false});
  }

  private findCatalogPrice(truckSize: string, material: string): ProductPrice | undefined {
    const code = this.buildCatalogCode(truckSize, material);
    return this.productPrices.find(item => item.code === code);
  }

  private buildCatalogCode(truckSize: string, material: string): string {
    return `M${(truckSize || '').replace(/[^0-9]/g, '')}_${this.normalizeMaterialCode(material)}`;
  }

  private normalizeMaterialCode(material: string): string {
    return (material || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace('/', '_')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .toUpperCase()
      .replace('PO_PEDRA', 'PO_DE_PEDRA')
      .replace('PEDRA_34', 'PEDRA_3_4');
  }

  private applyDateRulesByStatus(): void {
    const status = this.selectedStatusUpper;

    const scheduledCtrl = this.carLoadForm.get('deliveryScheduledDate')!;
    const deliveredCtrl = this.carLoadForm.get('deliveryDate')!;

    scheduledCtrl.clearValidators();
    deliveredCtrl.clearValidators();

    if (status === 'SCHEDULED') {
      scheduledCtrl.setValidators([Validators.required]);
      deliveredCtrl.setValue('', {emitEvent: false});
    } else if (status === 'DELIVERED') {
      deliveredCtrl.setValidators([Validators.required]);
    } else if (status === 'CANCELLED') {
      deliveredCtrl.setValue('', {emitEvent: false});
    }

    scheduledCtrl.updateValueAndValidity({emitEvent: false});
    deliveredCtrl.updateValueAndValidity({emitEvent: false});
  }

  private normalizeDateTimeLocal(v: string | null | undefined): string | null {
    if (!v) return null;
    if (!v.includes('T')) return `${v}T00:00:00`;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return `${v}:00`;
    return v;
  }

  private getReportCarloads(mode: CarloadReportMode): CarLoad[] {
    const sorted = [...this.dataSource].sort((a, b) => this.reportDateTime(b) - this.reportDateTime(a));

    if (mode === 'ALL') {
      return sorted;
    }

    if (mode === 'PRESET') {
      const {start, end} = this.getPresetRange(this.reportForm.value.preset || 'THIS_MONTH');
      return sorted.filter(item => {
        const time = this.reportDateTime(item);
        return time >= start.getTime() && time <= end.getTime();
      });
    }

    if (mode === 'PERIOD') {
      const startValue = this.reportForm.value.startDate;
      const endValue = this.reportForm.value.endDate;

      if (!startValue || !endValue) {
        this.message.warning(this.t('carloads.messages.periodRequired'));
        return [];
      }

      const start = new Date(startValue);
      const end = new Date(endValue);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      return sorted.filter(item => {
        const time = this.reportDateTime(item);
        return time >= start.getTime() && time <= end.getTime();
      });
    }

    const limit = Number(this.reportForm.value.limit || 30);
    return sorted.slice(0, Math.max(limit, 1));
  }

  private getReportScopeLabel(mode: CarloadReportMode): string {
    if (mode === 'ALL') {
      return this.t('carloads.scopes.all');
    }

    if (mode === 'PRESET') {
      const preset = this.reportForm.value.preset || 'THIS_MONTH';
      const {start, end} = this.getPresetRange(preset);
      return `${this.getPresetLabel(preset)} (${this.formatDateLabel(start)} ate ${this.formatDateLabel(end)})`;
    }

    if (mode === 'PERIOD') {
      return `Carradas de ${this.formatDateLabel(this.reportForm.value.startDate)} ate ${this.formatDateLabel(this.reportForm.value.endDate)}`;
    }

    return `Ultimas ${Number(this.reportForm.value.limit || 30)} carradas`;
  }

  private getPresetRange(preset: CarloadReportPreset): { start: Date; end: Date } {
    const today = new Date();
    const start = new Date(today);
    const end = new Date(today);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (preset === 'TODAY') {
      return {start, end};
    }

    if (preset === 'THIS_WEEK') {
      const day = start.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diffToMonday);
      return {start, end};
    }

    if (preset === 'THIS_MONTH') {
      start.setDate(1);
      return {start, end};
    }

    if (preset === 'LAST_MONTH') {
      start.setMonth(start.getMonth() - 1, 1);
      end.setFullYear(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return {start, end};
    }

    start.setDate(start.getDate() - 29);
    return {start, end};
  }

  private getPresetLabel(preset: CarloadReportPreset): string {
    const labels: Record<CarloadReportPreset, string> = {
      TODAY: this.t('carloads.reportDrawer.today'),
      THIS_WEEK: this.t('carloads.reportDrawer.thisWeek'),
      THIS_MONTH: this.t('carloads.reportDrawer.thisMonth'),
      LAST_MONTH: this.t('carloads.reportDrawer.lastMonth'),
      LAST_30_DAYS: this.t('carloads.reportDrawer.last30Days')
    };

    return labels[preset];
  }

  private reportDateTime(carload: CarLoad): number {
    const value = carload.deliveryDate || carload.deliveryScheduledDate || carload.createdAt;
    const date = new Date(value || '');
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private formatDateLabel(value: string | Date | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  private toDatetimeLocalInput(iso: string | null | undefined): string {
    if (!iso) return '';
    const withoutZone = iso.replace('Z', '').split('+')[0];
    const cleaned = withoutZone.split('.')[0];
    if (!cleaned.includes('T')) return `${cleaned}T00:00`;
    return cleaned.substring(0, 16);
  }

  private mapCarloadToForm(carload: CarLoad) {
    return {
      customerId: carload.customerId || null,
      customerName: carload.customerName,
      customerPhoneNumber: carload.customerPhoneNumber?.replace('+258', '').trim() || carload.customerPhoneNumber,
      deliveryDestination: carload.deliveryDestination,
      transportedMaterial: carload.transportedMaterial,
      quantity: carload.quantity || 1,
      truckSize: carload.truckSize || '',

      logisticsManagerId: null,
      assignedDriverId: carload.assignedDriverId,
      assignedTruckId: carload.assignedTruckId || null,
      carloadBatchId: carload.carloadBatchId,

      totalSpent: carload.driverAmount ?? carload.totalSpent,
      totalEarnings: carload.customerPrice ?? carload.totalEarnings,
      driverAmount: carload.driverAmount ?? carload.totalSpent,
      customerPrice: carload.customerPrice ?? carload.totalEarnings,
      companyCommission: carload.companyCommission ?? ((carload.customerPrice ?? carload.totalEarnings) - (carload.driverAmount ?? carload.totalSpent)),

      carloadType: carload.carloadType,
      deliveryStatus: carload.deliveryStatus || 'SCHEDULED',

      deliveryScheduledDate: this.toDatetimeLocalInput(carload.deliveryScheduledDate),
      deliveryDate: this.toDatetimeLocalInput(carload.deliveryDate)
    };
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsDirty();
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private getCurrentUserRole(): string {
    try {
      const rawUser = localStorage.getItem('user');
      return rawUser ? (JSON.parse(rawUser)?.role || '').toString().toUpperCase() : '';
    } catch {
      return '';
    }
  }

  private resolveMoneyValue(primary: unknown, fallback: unknown): number {
    const primaryValue = Number(primary ?? 0);
    const fallbackValue = Number(fallback ?? 0);

    if (primaryValue === 0 && fallbackValue > 0) {
      return fallbackValue;
    }

    return Number.isFinite(primaryValue) ? primaryValue : fallbackValue;
  }

  t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }
}
