import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzModalService} from 'ng-zorro-antd/modal';

import {CarLoad, CarLoadStatus, CarloadType} from '@shared/models/carload';
import {CarloadService} from '@core/services/carload.service';

import {Driver} from '@shared/models/driver';
import {Manager} from '@shared/models/manager';
import {Sprint} from '@shared/models/sprint';
import {CarloadCustomer} from '@shared/models/carload-customer';

import {DriverService} from '@core/services/driver.service';
import {ManagerService} from '@core/services/manager.service';
import {SprintService} from '@core/services/sprint.service';
import {CarloadCustomerService} from '@core/services/carload-customer.service';

type FilterMode = 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
type CustomerMode = 'NEW' | 'EXISTING';

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
  managers: Manager[] = [];
  sprints: Sprint[] = [];
  customers: CarloadCustomer[] = [];
  isLoadingLookups = false;

  searchValue = '';
  visible = false;
  isCarLoadDrawerVisible = false;

  filterMode: FilterMode = 'ALL';

  isEditMode = false;
  isCopyMode = false;
  carLoadDrawerTitle = 'Criar Carrada';
  selectedCarLoadId: string | null = null;

  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  customerMode: CustomerMode = 'NEW';

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
    customerName: new FormControl('', Validators.required),
    customerPhoneNumber: new FormControl('', [Validators.required, Validators.pattern('^[+0-9 ]+$')]),

    deliveryDestination: new FormControl('', Validators.required),
    transportedMaterial: new FormControl('', Validators.required),

    logisticsManagerId: new FormControl<string | null>(null),
    assignedDriverId: new FormControl('', Validators.required),
    carloadBatchId: new FormControl('', Validators.required),

    totalSpent: new FormControl(0, [Validators.required, Validators.min(0)]),
    totalEarnings: new FormControl(0, [Validators.required, Validators.min(0)]),

    carloadType: new FormControl<CarloadType>('Produced', Validators.required),
    deliveryStatus: new FormControl<CarLoadStatus>('SCHEDULED', Validators.required),

    deliveryScheduledDate: new FormControl<string | null>(''),
    deliveryDate: new FormControl<string | null>(''),
  });

  constructor(
    private carLoadService: CarloadService,
    private driverService: DriverService,
    private managerService: ManagerService,
    private sprintService: SprintService,
    private customerService: CarloadCustomerService,
    private message: NzMessageService,
    private modal: NzModalService
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

  get shouldDisableManager(): boolean {
    return this.selectedCarloadType === 'Sold';
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

    this.carLoadForm.get('carloadType')!.valueChanges.subscribe(() => {
      if (this.shouldDisableManager) {
        this.carLoadForm.patchValue({logisticsManagerId: null}, {emitEvent: false});
      }
    });

    this.carLoadForm.get('customerId')!.valueChanges.subscribe(value => {
      if (this.customerMode === 'EXISTING' && value) {
        this.fillCustomerFromSelection(value);
      }
    });

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
        return 'Agendada';
      case 'IN_PROGRESS':
        return 'Em execução';
      case 'DELIVERED':
        return 'Entregue';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status as string;
    }
  }

  isDelivered(status: CarLoadStatus): boolean {
    return (status || '').toUpperCase() === 'DELIVERED';
  }

  loadLookups(): void {
    this.isLoadingLookups = true;

    this.driverService.getDrivers().subscribe({
      next: data => (this.drivers = data || []),
      error: () => this.message.error('Erro ao carregar motoristas.')
    });

    this.managerService.getManagers().subscribe({
      next: data => (this.managers = data || []),
      error: () => this.message.error('Erro ao carregar gestores.')
    });

    this.sprintService.getSprints().subscribe({
      next: data => (this.sprints = data || []),
      error: () => this.message.error('Erro ao carregar sprints.')
    });

    this.customerService.getCustomers().subscribe({
      next: data => (this.customers = data || []),
      error: () => this.message.error('Erro ao carregar clientes.')
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
        this.message.error('Erro ao carregar carradas.');
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

  reset(): void {
    this.searchValue = '';
    this.filterMode = 'ALL';
    this.search();
  }

  openCarLoadDrawer(): void {
    this.isEditMode = false;
    this.isCopyMode = false;
    this.selectedCarLoadId = null;
    this.carLoadDrawerTitle = 'Criar Carrada';
    this.customerMode = 'NEW';

    this.carLoadForm.reset({
      customerId: null,
      customerName: '',
      customerPhoneNumber: '',
      deliveryDestination: '',
      transportedMaterial: '',
      logisticsManagerId: null,
      assignedDriverId: '',
      carloadBatchId: '',
      totalSpent: 0,
      totalEarnings: 0,
      carloadType: 'Produced',
      deliveryStatus: 'SCHEDULED',
      deliveryScheduledDate: '',
      deliveryDate: ''
    });

    if (!this.drivers.length || !this.managers.length || !this.sprints.length || !this.customers.length) {
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
    this.carLoadDrawerTitle = 'Editar Carrada';
    this.selectedCarLoadId = carload.id;

    if (!this.drivers.length || !this.managers.length || !this.sprints.length || !this.customers.length) {
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
    this.carLoadDrawerTitle = 'Copiar Carrada';

    if (!this.drivers.length || !this.managers.length || !this.sprints.length || !this.customers.length) {
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
      this.message.warning('Preencha todos os campos obrigatórios!');
      return;
    }

    this.isSaving = true;

    const formData: any = {...this.carLoadForm.value};

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

    if (formData.carloadType === 'Sold') {
      formData.logisticsManagerId = null;
    }

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
          this.message.success('Carrada actualizada com sucesso!');
        } else if (this.isCopyMode) {
          this.message.success('Carrada copiada e criada com sucesso!');
        } else {
          this.message.success('Carrada criada com sucesso!');
        }

        this.isSaving = false;
      },
      error: () => {
        this.message.error('Erro ao gravar carrada.');
        this.isSaving = false;
      }
    });
  }

  deleteCarLoad(data: CarLoad): void {
    this.modal.confirm({
      nzTitle: 'Tens certeza que quer eliminar esta Carrada?',
      nzContent: `Cliente: <strong>${data.customerName}</strong> — Destino: <strong>${data.deliveryDestination}</strong>`,
      nzOkDanger: true,
      nzOkText: 'Sim',
      nzCancelText: 'Não',
      nzOnOk: () =>
        this.carLoadService.deleteCarLoad(data.id).subscribe({
          next: () => {
            this.getCarLoads();
            this.message.success('Carrada eliminada com sucesso!');
          },
          error: () => this.message.error('Erro ao eliminar carrada.')
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
      customerNameCtrl.setValidators([Validators.required]);
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

      logisticsManagerId: carload.logisticsManagerId,
      assignedDriverId: carload.assignedDriverId,
      carloadBatchId: carload.carloadBatchId,

      totalSpent: carload.totalSpent,
      totalEarnings: carload.totalEarnings,

      carloadType: carload.carloadType,
      deliveryStatus: carload.deliveryStatus || 'SCHEDULED',

      deliveryScheduledDate: this.toDatetimeLocalInput(carload.deliveryScheduledDate),
      deliveryDate: this.toDatetimeLocalInput(carload.deliveryDate)
    };
  }
}
