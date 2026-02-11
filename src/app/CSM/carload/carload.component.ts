// carload.component.ts ✅ COMPLETO (com quick filters + 4 cenários datas)

import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzModalService} from 'ng-zorro-antd/modal';

import {CarLoad} from '../../models/CSM/carlaod';
import {CarloadService} from '../../services/carload.service';

import {Driver} from '../../models/CSM/driver';
import {Manager} from '../../models/CSM/manager';
import {Sprint} from '../../models/CSM/sprint';

import {DriverService} from '../../services/driver.service';
import {ManagerService} from '../../services/manager.service';
import {SprintService} from '../../services/sprint.service';

type CarLoadStatus = 'SCHEDULED' | 'PENDING' | 'DELIVERED' | 'CANCELLED' | 'ENTREGUE' | string;
type FilterMode = 'ALL' | 'SCHEDULED' | 'PENDING' | 'DELIVERED' | 'CANCELLED';

@Component({
  selector: 'app-carload',
  standalone: false,
  templateUrl: './carload.component.html',
  styleUrls: ['./carload.component.scss']
})
export class CarLoadComponent implements OnInit {

  // ========= Data =========
  dataSource: CarLoad[] = [];
  listOfDisplayData: CarLoad[] = [];

  isLoading = false;
  isSaving = false;

  totalCarLoads = 0;
  delivered = 0;
  pending = 0;

  // ========= Lookups (Selects) =========
  drivers: Driver[] = [];
  managers: Manager[] = [];
  sprints: Sprint[] = [];
  isLoadingLookups = false;

  // ========= UI =========
  searchValue = '';
  visible = false;
  isCarLoadDrawerVisible = false;

  // ✅ Quick filter
  filterMode: FilterMode = 'ALL';

  // ========= Edit / Copy =========
  isEditMode = false;
  isCopyMode = false;
  carLoadDrawerTitle = 'Criar Carrada';
  selectedCarLoadId: any | null = null;

  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  // ========= Materials =========
  materials: string[] = [
    'Areia grossa',
    'Areia vermelha',
    'Areia fina',
    'Pedra 3/4',
    'Pedra enrocamento',
    'Pedra sarrisca'
  ];

  // ========= Form =========
  // ✅ Regras:
  // - CANCELLED: não tem scheduledDate nem deliveredDate
  // - SCHEDULED: precisa deliveryScheduledDate
  // - DELIVERED/ENTREGUE: precisa deliveredDate
  // - PENDING: não pede nenhuma data (createdAt é automático no backend)
  carLoadForm = new FormGroup({
    customerName: new FormControl('', Validators.required),
    customerPhoneNumber: new FormControl('', [Validators.required, Validators.pattern('^[+0-9 ]+$')]),
    deliveryDestination: new FormControl('', Validators.required),
    transportedMaterial: new FormControl('', Validators.required),

    logisticsManagerId: new FormControl('', Validators.required),
    assignedDriverId: new FormControl('', Validators.required),
    carloadBatchId: new FormControl('', Validators.required),

    totalSpent: new FormControl(0, [Validators.required, Validators.min(0)]),
    totalEarnings: new FormControl(0, [Validators.required, Validators.min(0)]),

    deliveryStatus: new FormControl<CarLoadStatus>('PENDING', Validators.required),

    // ✅ data agendada (aparece só quando status = SCHEDULED)
    deliveryScheduledDate: new FormControl<string | null>(''),

    // ✅ data de entrega (aparece só quando status = DELIVERED/ENTREGUE)
    deliveredDate: new FormControl<string | null>(''),
  });

  constructor(
    private carLoadService: CarloadService,
    private driverService: DriverService,
    private managerService: ManagerService,
    private sprintService: SprintService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {
  }

  // ✅ Helpers para UI
  get selectedStatusUpper(): string {
    return (this.carLoadForm.get('deliveryStatus')?.value || 'PENDING').toString().toUpperCase();
  }

  get shouldShowScheduledDate(): boolean {
    return this.selectedStatusUpper === 'SCHEDULED';
  }

  get shouldShowDeliveredDate(): boolean {
    return this.selectedStatusUpper === 'DELIVERED' || this.selectedStatusUpper === 'ENTREGUE';
  }

  ngOnInit(): void {
    this.getCarLoads();
    this.loadLookups();

    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());

    // ✅ controla validadores e limpeza automática quando muda status
    this.carLoadForm.get('deliveryStatus')!.valueChanges.subscribe(() => {
      this.applyDateRulesByStatus();
    });

    // aplica regras iniciais
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

  // ========= Status helpers =========
  getStatusLabel(status: CarLoadStatus): string {
    switch ((status || '').toUpperCase()) {
      case 'SCHEDULED':
        return 'Agendada';
      case 'PENDING':
        return 'Pendente';
      case 'DELIVERED':
      case 'ENTREGUE':
        return 'Entregue';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status as string;
    }
  }

  isDelivered(status: CarLoadStatus): boolean {
    const s = (status || '').toUpperCase();
    return s === 'DELIVERED' || s === 'ENTREGUE';
  }

  // ========= Lookups =========
  loadLookups() {
    this.isLoadingLookups = true;

    this.driverService.getDrivers().subscribe({
      next: (data) => (this.drivers = data || []),
      error: () => this.message.error('Erro ao carregar motoristas. 🚫')
    });

    this.managerService.getManagers().subscribe({
      next: (data) => (this.managers = data || []),
      error: () => this.message.error('Erro ao carregar gestores. 🚫')
    });

    this.sprintService.getSprints().subscribe({
      next: (data) => (this.sprints = data || []),
      error: () => this.message.error('Erro ao carregar sprints. 🚫')
    });

    setTimeout(() => (this.isLoadingLookups = false), 500);
  }

  // ========= Data =========
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
        this.message.error('Erro ao carregar carradas. 🚫');
        this.isLoading = false;
      }
    });
  }

  calculateStats() {
    this.totalCarLoads = this.dataSource.length;
    this.delivered = this.dataSource.filter(c => this.isDelivered(c.deliveryStatus as any)).length;
    this.pending = this.totalCarLoads - this.delivered;
  }

  // ========= Quick Filters =========
  setFilterMode(mode: FilterMode): void {
    this.filterMode = mode;
    this.applyFilters();
  }

  // ========= Filters/Search =========
  applyFilters() {
    let data = [...this.dataSource];

    // ✅ filtro rápido por status
    if (this.filterMode !== 'ALL') {
      const mode = this.filterMode.toUpperCase();
      data = data.filter(item => {
        const s = (item.deliveryStatus || '').toString().toUpperCase();
        if (mode === 'DELIVERED') return s === 'DELIVERED' || s === 'ENTREGUE';
        return s === mode;
      });
    }

    // ✅ search
    if (this.searchValue) {
      const v = this.searchValue.toLowerCase();
      data = data.filter(item =>
        (item.customerName || '').toLowerCase().includes(v) ||
        (item.customerPhoneNumber || '').toLowerCase().includes(v) ||
        (item.deliveryDestination || '').toLowerCase().includes(v) ||
        (item.transportedMaterial || '').toLowerCase().includes(v) ||
        (item.assignedDriverName || '').toLowerCase().includes(v) ||
        (item.logisticsManagerName || '').toLowerCase().includes(v) ||
        (item.carloadBatchName || '').toLowerCase().includes(v)
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

  // ========= Drawer =========
  openCarLoadDrawer() {
    this.isEditMode = false;
    this.isCopyMode = false;
    this.selectedCarLoadId = null;
    this.carLoadDrawerTitle = 'Criar Carrada';

    this.carLoadForm.reset({
      deliveryStatus: 'PENDING',
      totalSpent: 0,
      totalEarnings: 0,
      deliveryScheduledDate: '',
      deliveredDate: ''
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
      deliveryStatus: 'PENDING',
      deliveryScheduledDate: '',
      deliveredDate: ''
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

    const formData: any = {...this.carLoadForm.value};

    // Normalizar phone para +258
    const rawPhone = (formData.customerPhoneNumber || '').toString().trim();
    formData.customerPhoneNumber = rawPhone.startsWith('+258') ? rawPhone : `+258 ${rawPhone}`;

    // Enum
    formData.deliveryStatus = (formData.deliveryStatus || 'PENDING').toString().toUpperCase();

    // ✅ regras finais antes do POST/PUT
    if (formData.deliveryStatus === 'CANCELLED' || formData.deliveryStatus === 'PENDING') {
      formData.deliveryScheduledDate = null;
      formData.deliveredDate = null;
    }

    if (formData.deliveryStatus === 'SCHEDULED') {
      formData.deliveryScheduledDate = this.normalizeDateTimeLocal(formData.deliveryScheduledDate);
      formData.deliveredDate = null;
    }

    if (formData.deliveryStatus === 'DELIVERED' || formData.deliveryStatus === 'ENTREGUE') {
      formData.deliveredDate = this.normalizeDateTimeLocal(formData.deliveredDate);
      formData.deliveryScheduledDate = this.normalizeDateTimeLocal(formData.deliveryScheduledDate);
      if (!formData.deliveryScheduledDate) formData.deliveryScheduledDate = null;
    }

    const isUpdate = this.isEditMode && this.selectedCarLoadId;
    const request$ = isUpdate
      ? this.carLoadService.updateCarLoad(this.selectedCarLoadId, formData)
      : this.carLoadService.addCarLoad(formData);

    request$.subscribe({
      next: () => {
        this.getCarLoads();
        this.closeCarLoadDrawer();

        if (isUpdate) {
          this.message.success('Carrada atualizada com sucesso! ✅');
        } else if (this.isCopyMode) {
          this.message.success('Carrada copiada e criada com sucesso! 📋✅');
        } else {
          this.message.success('Carrada criada com sucesso! 🎉');
        }

        this.isSaving = false;
      },
      error: () => {
        this.message.error('Erro ao gravar carrada. 🚫');
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
            this.message.success('Carrada eliminada com sucesso! 🗑️');
          },
          error: () => this.message.error('Erro ao eliminar carrada. 🚫')
        })
    });
  }

  onBack() {
    window.history.back();
  }

  // ✅ aplica regras pedidas (validators + limpar campos)
  private applyDateRulesByStatus(): void {
    const status = this.selectedStatusUpper;

    const scheduledCtrl = this.carLoadForm.get('deliveryScheduledDate')!;
    const deliveredCtrl = this.carLoadForm.get('deliveredDate')!;

    scheduledCtrl.clearValidators();
    deliveredCtrl.clearValidators();

    if (status === 'SCHEDULED') {
      scheduledCtrl.setValidators([Validators.required]);
      deliveredCtrl.setValue('', {emitEvent: false});
    } else if (status === 'DELIVERED' || status === 'ENTREGUE') {
      deliveredCtrl.setValidators([Validators.required]);
    } else if (status === 'CANCELLED') {
      scheduledCtrl.setValue('', {emitEvent: false});
      deliveredCtrl.setValue('', {emitEvent: false});
    } else if (status === 'PENDING') {
      scheduledCtrl.setValue('', {emitEvent: false});
      deliveredCtrl.setValue('', {emitEvent: false});
    }

    scheduledCtrl.updateValueAndValidity({emitEvent: false});
    deliveredCtrl.updateValueAndValidity({emitEvent: false});
  }

  // ========= Date helpers =========
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

      deliveryStatus: (carload.deliveryStatus as any) || 'PENDING',

      deliveryScheduledDate: this.toDatetimeLocalInput(carload.deliveryScheduledDate as any),
      deliveredDate: this.toDatetimeLocalInput((carload as any).deliveredDate)
    };
  }
}
