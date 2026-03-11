import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { CarLoad, CarLoadStatus, CarloadType } from '../../models/CSM/carlaod';
import { CarloadService } from '../../services/carload.service';

import { Driver } from '../../models/CSM/driver';
import { Manager } from '../../models/CSM/manager';
import { Sprint } from '../../models/CSM/sprint';

import { DriverService } from '../../services/driver.service';
import { ManagerService } from '../../services/manager.service';
import { SprintService } from '../../services/sprint.service';

type FilterMode = 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';

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

  materials: string[] = [
    'Areia grossa',
    'Areia vermelha',
    'Areia fina',
    'Pedra 3/4',
    'Pedra enrocamento',
    'Pedra sarrisca'
  ];

  carLoadForm = new FormGroup({
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
    private message: NzMessageService,
    private modal: NzModalService
  ) {}

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
        this.carLoadForm.patchValue({ logisticsManagerId: null }, { emitEvent: false });
      }
    });

    this.applyDateRulesByStatus();
  }

  updateDrawer() {
    if (window.innerWidth <= 768) {
      this.drawerWidth = '100%';
      this.drawerPlacement = 'bottom';
    } else {
      this.drawerWidth = 720;
      this.drawerPlacement = 'right';
    }
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

  loadLookups() {
    this.isLoadingLookups = true;

    this.driverService.getDrivers().subscribe({
      next: (data) => (this.drivers = data || []),
      error: () => this.message.error('Erro ao carregar motoristas.')
    });

    this.managerService.getManagers().subscribe({
      next: (data) => (this.managers = data || []),
      error: () => this.message.error('Erro ao carregar gestores.')
    });

    this.sprintService.getSprints().subscribe({
      next: (data) => (this.sprints = data || []),
      error: () => this.message.error('Erro ao carregar sprints.')
    });

    setTimeout(() => (this.isLoadingLookups = false), 500);
  }

  getCarLoads() {
    this.isLoading = true;
    this.carLoadService.getCarLoads().subscribe({
      next: (data) => {
        this.dataSource = data;
        this.listOfDisplayData = [...data];
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

  calculateStats() {
    this.totalCarLoads = this.dataSource.length;
    this.scheduled = this.dataSource.filter(c => c.deliveryStatus === 'SCHEDULED').length;
    this.inProgress = this.dataSource.filter(c => c.deliveryStatus === 'IN_PROGRESS').length;
    this.delivered = this.dataSource.filter(c => c.deliveryStatus === 'DELIVERED').length;
  }

  setFilterMode(mode: FilterMode): void {
    this.filterMode = mode;
    this.applyFilters();
  }

  applyFilters() {
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

  search() {
    this.visible = false;
    this.applyFilters();
  }

  reset() {
    this.searchValue = '';
    this.filterMode = 'ALL';
    this.search();
  }

  openCarLoadDrawer() {
    this.isEditMode = false;
    this.isCopyMode = false;
    this.selectedCarLoadId = null;
    this.carLoadDrawerTitle = 'Criar Carrada';

    this.carLoadForm.reset({
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

    if (!this.drivers.length || !this.managers.length || !this.sprints.length) {
      this.loadLookups();
    }

    this.isCarLoadDrawerVisible = true;
    this.applyDateRulesByStatus();
  }

  closeCarLoadDrawer() {
    this.isCarLoadDrawerVisible = false;
    this.carLoadForm.reset();
    this.selectedCarLoadId = null;
    this.isEditMode = false;
    this.isCopyMode = false;
  }

  editCarLoad(carload: CarLoad) {
    this.isEditMode = true;
    this.isCopyMode = false;
    this.carLoadDrawerTitle = 'Editar Carrada';
    this.selectedCarLoadId = carload.id;

    if (!this.drivers.length || !this.managers.length || !this.sprints.length) {
      this.loadLookups();
    }

    this.isCarLoadDrawerVisible = true;
    this.carLoadForm.patchValue(this.mapCarloadToForm(carload));
    this.applyDateRulesByStatus();
  }

  copyCarLoad(carload: CarLoad) {
    this.isEditMode = false;
    this.isCopyMode = true;
    this.selectedCarLoadId = null;
    this.carLoadDrawerTitle = 'Copiar Carrada';

    if (!this.drivers.length || !this.managers.length || !this.sprints.length) {
      this.loadLookups();
    }

    this.isCarLoadDrawerVisible = true;
    this.carLoadForm.patchValue(this.mapCarloadToForm(carload));
    this.carLoadForm.patchValue({
      deliveryStatus: 'SCHEDULED',
      deliveryScheduledDate: '',
      deliveryDate: ''
    });

    this.applyDateRulesByStatus();
  }

  saveCarLoad() {
    this.applyDateRulesByStatus();

    if (this.carLoadForm.invalid) {
      this.message.warning('Preencha todos os campos obrigatórios!');
      return;
    }

    this.isSaving = true;

    const formData: any = { ...this.carLoadForm.value };

    const rawPhone = (formData.customerPhoneNumber || '').toString().trim();
    formData.customerPhoneNumber = rawPhone.startsWith('+258') ? rawPhone : `+258 ${rawPhone}`;

    formData.deliveryStatus = (formData.deliveryStatus || 'SCHEDULED').toString().toUpperCase();
    formData.carloadType = formData.carloadType || 'Produced';

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

  deleteCarLoad(data: CarLoad) {
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

  onBack() {
    window.history.back();
  }

  private applyDateRulesByStatus(): void {
    const status = this.selectedStatusUpper;

    const scheduledCtrl = this.carLoadForm.get('deliveryScheduledDate')!;
    const deliveredCtrl = this.carLoadForm.get('deliveryDate')!;

    scheduledCtrl.clearValidators();
    deliveredCtrl.clearValidators();

    if (status === 'SCHEDULED') {
      scheduledCtrl.setValidators([Validators.required]);
      deliveredCtrl.setValue('', { emitEvent: false });
    } else if (status === 'DELIVERED') {
      deliveredCtrl.setValidators([Validators.required]);
    } else if (status === 'CANCELLED') {
      deliveredCtrl.setValue('', { emitEvent: false });
    }

    scheduledCtrl.updateValueAndValidity({ emitEvent: false });
    deliveredCtrl.updateValueAndValidity({ emitEvent: false });
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
