import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { CarLoad } from '../../models/CSM/carlaod';
import { Driver } from '../../models/CSM/driver';
import { Manager } from '../../models/CSM/manager';

import { CarloadService } from '../../services/carload.service';
import { DriverService } from '../../services/driver.service';
import { ManagerService } from '../../services/manager.service';
import { SprintService } from '../../services/sprint.service';

type CarLoadStatus = 'SCHEDULED' | 'PENDING' | 'DELIVERED' | 'CANCELLED' | 'ENTREGUE' | string;
type FilterMode = 'ALL' | 'SCHEDULED' | 'DELIVERED' | 'PENDING' | 'CANCELLED';

@Component({
  selector: 'app-sprint-details',
  standalone: false,
  templateUrl: './sprint-details.component.html',
  styleUrl: './sprint-details.component.scss'
})
export class SprintDetailsComponent implements OnInit {

  // ========= Route / Sprint =========
  sprintId!: string;
  sprintName = '';

  // ========= Data =========
  allCarloads: CarLoad[] = [];
  listOfDisplayData: CarLoad[] = [];

  isLoading = false;
  isSaving = false;

  // ========= Stats =========
  totalCarloads = 0;
  totalAgendados = 0;
  totalEntregue = 0;
  totalPendente = 0;
  totalCanceladas = 0;

  // ========= Lookups =========
  dataDrivers: Driver[] = [];
  dataManagers: Manager[] = [];
  isLoadingLookups = false;

  // ========= UI / Filters =========
  searchValue = '';
  filterMode: FilterMode = 'ALL';
  dateRange: Date[] | null = null; // usado no range picker

  // ========= Drawer =========
  isCarloadDrawerVisible = false;
  isEditMode = false;
  isCopyMode = false;
  carLoadDrawerTitle = 'Criar Carrada';
  selectedCarLoadId: string | null = null;

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
  carloadForm = new FormGroup({
    customerName: new FormControl('', Validators.required),
    customerPhoneNumber: new FormControl('', [Validators.required, Validators.pattern('^[+0-9 ]+$')]),
    deliveryDestination: new FormControl('', Validators.required),
    transportedMaterial: new FormControl('', Validators.required),

    logisticsManagerId: new FormControl('', Validators.required),
    assignedDriverId: new FormControl('', Validators.required),

    // sprint fixo: sempre vai o sprintId no payload
    carloadBatchId: new FormControl('', Validators.required),

    totalSpent: new FormControl(0, [Validators.required, Validators.min(0)]),
    totalEarnings: new FormControl(0, [Validators.required, Validators.min(0)]),

    deliveryStatus: new FormControl<CarLoadStatus>('PENDING', Validators.required),
    deliveryScheduledDate: new FormControl<string | null>(''),
    deliveredDate: new FormControl<string | null>(''),
  });

  constructor(
    private route: ActivatedRoute,
    private carloadService: CarloadService,
    private driverService: DriverService,
    private managerService: ManagerService,
    private sprintService: SprintService,
    private modal: NzModalService,
    private message: NzMessageService
  ) {}

  // ========= Helpers (UI) =========
  get selectedStatusUpper(): string {
    return (this.carloadForm.get('deliveryStatus')?.value || 'PENDING').toString().toUpperCase();
  }

  get shouldShowScheduledDate(): boolean {
    return this.selectedStatusUpper === 'SCHEDULED';
  }

  get shouldShowDeliveredDate(): boolean {
    return this.selectedStatusUpper === 'DELIVERED' || this.selectedStatusUpper === 'ENTREGUE';
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.sprintId = params['id'];
      this.loadSprintName();
      this.loadLookups();
      this.loadCarloadsBySprint();
    });

    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());

    this.carloadForm.get('deliveryStatus')!.valueChanges.subscribe(() => this.applyDateRulesByStatus());
    this.applyDateRulesByStatus();
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

  // ========= Status helpers =========
  getStatusLabel(status: CarLoadStatus): string {
    switch ((status || '').toUpperCase()) {
      case 'SCHEDULED': return 'Agendada';
      case 'PENDING': return 'Pendente';
      case 'DELIVERED':
      case 'ENTREGUE': return 'Entregue';
      case 'CANCELLED': return 'Cancelada';
      default: return status as string;
    }
  }

  getTagColor(status: CarLoadStatus): string {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED' || s === 'ENTREGUE') return 'green';
    if (s === 'SCHEDULED') return 'blue';
    if (s === 'CANCELLED') return 'red';
    return 'orange'; // pending/outros
  }

  // ========= Load Lookups =========
  loadLookups(): void {
    this.isLoadingLookups = true;

    this.driverService.getDrivers().subscribe({
      next: (data) => (this.dataDrivers = data || []),
      error: () => this.message.error('Erro ao carregar motoristas. 🚫')
    });

    this.managerService.getManagers().subscribe({
      next: (data) => (this.dataManagers = data || []),
      error: () => this.message.error('Erro ao carregar gestores. 🚫')
    });

    setTimeout(() => (this.isLoadingLookups = false), 400);
  }

  // ========= Data (by sprint endpoint) =========
  loadCarloadsBySprint(): void {
    this.isLoading = true;

    this.carloadService.getCarloadsBySprint(this.sprintId).subscribe({
      next: (data) => {
        this.allCarloads = data || [];
        this.calculateStats();
        this.applyFilter(); // aplica status/date/search
        this.isLoading = false;
      },
      error: () => {
        this.message.error('Erro ao carregar carradas desta sprint. 🚫');
        this.isLoading = false;
      }
    });
  }

  private loadSprintName(): void {
    this.sprintService.getSprintById(this.sprintId).subscribe({
      next: (sprint) => (this.sprintName = sprint?.name || ''),
      error: () => (this.sprintName = '')
    });
  }

  // ========= Stats =========
  private calculateStats(): void {
    this.totalCarloads = this.allCarloads.length;

    const up = (v: any) => (v || '').toString().toUpperCase();

    this.totalAgendados = this.allCarloads.filter(c => up(c.deliveryStatus) === 'SCHEDULED').length;
    this.totalEntregue = this.allCarloads.filter(c => up(c.deliveryStatus) === 'DELIVERED' || up(c.deliveryStatus) === 'ENTREGUE').length;
    this.totalPendente = this.allCarloads.filter(c => up(c.deliveryStatus) === 'PENDING').length;
    this.totalCanceladas = this.allCarloads.filter(c => up(c.deliveryStatus) === 'CANCELLED').length;
  }

  // ========= Filters =========
  setFilterMode(mode: FilterMode): void {
    this.filterMode = mode;
    this.applyFilter();
  }

  onDateRangeChange(): void {
    this.applyFilter();
  }

  search(): void {
    this.applyFilter();
  }

  resetFilters(): void {
    this.searchValue = '';
    this.filterMode = 'ALL';
    this.dateRange = null;
    this.applyFilter();
  }

  private applyFilter(): void {
    let filtered = [...this.allCarloads];
    const up = (v: any) => (v || '').toString().toUpperCase();

    // status
    if (this.filterMode !== 'ALL') {
      filtered = filtered.filter(c => up(c.deliveryStatus) === this.filterMode);
    }

    // date range (usa deliveryScheduledDate se existir, senão createdAt)
    if (this.dateRange && this.dateRange.length === 2) {
      const [start, end] = this.dateRange;
      if (start && end) {
        const startDate = new Date(start).setHours(0, 0, 0, 0);
        const endDate = new Date(end).setHours(23, 59, 59, 999);

        filtered = filtered.filter(c => {
          const d = new Date((c as any).deliveryScheduledDate || (c as any).createdAt).getTime();
          return d >= startDate && d <= endDate;
        });
      }
    }

    // search
    const v = (this.searchValue || '').toLowerCase().trim();
    if (v) {
      filtered = filtered.filter(item =>
        (item.customerName || '').toLowerCase().includes(v) ||
        (item.customerPhoneNumber || '').toLowerCase().includes(v) ||
        (item.deliveryDestination || '').toLowerCase().includes(v) ||
        (item.transportedMaterial || '').toLowerCase().includes(v) ||
        (item.assignedDriverName || '').toLowerCase().includes(v)
      );
    }

    this.listOfDisplayData = filtered;

    // cards devem refletir sprint total (allCarloads), mas se quiseres refletir filtrado:
    // this.totalCarloads = this.listOfDisplayData.length;
  }

  // ========= Drawer =========
  openCarloadDrawer(): void {
    this.isEditMode = false;
    this.isCopyMode = false;
    this.selectedCarLoadId = null;
    this.carLoadDrawerTitle = 'Criar Carrada';

    this.carloadForm.reset({
      deliveryStatus: 'PENDING',
      totalSpent: 0,
      totalEarnings: 0,
      deliveryScheduledDate: '',
      deliveredDate: '',
      carloadBatchId: this.sprintId
    });

    this.isCarloadDrawerVisible = true;
    this.applyDateRulesByStatus();
  }

  closeCarloadDrawer(): void {
    if (this.isSaving) return;

    this.isCarloadDrawerVisible = false;
    this.selectedCarLoadId = null;
    this.isEditMode = false;
    this.isCopyMode = false;

    this.carloadForm.reset({
      deliveryStatus: 'PENDING',
      totalSpent: 0,
      totalEarnings: 0,
      carloadBatchId: this.sprintId
    });
  }

  editCarload(carload: CarLoad): void {
    this.isEditMode = true;
    this.isCopyMode = false;
    this.selectedCarLoadId = carload.id;
    this.carLoadDrawerTitle = 'Editar Carrada';

    this.isCarloadDrawerVisible = true;
    this.carloadForm.patchValue(this.mapCarloadToForm(carload));

    // força sprint fixo
    this.carloadForm.patchValue({ carloadBatchId: this.sprintId });

    this.applyDateRulesByStatus();
  }

  copyCarLoad(carload: CarLoad): void {
    this.isEditMode = false;
    this.isCopyMode = true;
    this.selectedCarLoadId = null;
    this.carLoadDrawerTitle = 'Copiar Carrada';

    this.isCarloadDrawerVisible = true;
    this.carloadForm.patchValue(this.mapCarloadToForm(carload));

    // ao copiar: PENDING e limpa datas
    this.carloadForm.patchValue({
      carloadBatchId: this.sprintId,
      deliveryStatus: 'PENDING',
      deliveryScheduledDate: '',
      deliveredDate: ''
    });

    this.applyDateRulesByStatus();
  }

  submitCarload(): void {
    this.applyDateRulesByStatus();

    if (this.carloadForm.invalid) {
      this.message.warning('Preencha todos os campos obrigatórios!');
      return;
    }

    this.isSaving = true;

    const formData: any = { ...this.carloadForm.value };

    // Sprint fixo
    formData.carloadBatchId = this.sprintId;

    // normalizar phone +258
    const rawPhone = (formData.customerPhoneNumber || '').toString().trim();
    formData.customerPhoneNumber = rawPhone.startsWith('+258') ? rawPhone : `+258 ${rawPhone}`;

    // normalizar status
    formData.deliveryStatus = (formData.deliveryStatus || 'PENDING').toString().toUpperCase();

    // regras finais para datas
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
      ? this.carloadService.updateCarLoad(this.selectedCarLoadId!, formData)
      : this.carloadService.addCarLoad(formData);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeCarloadDrawer();
        this.loadCarloadsBySprint();

        if (isUpdate) {
          this.message.success('Carrada atualizada com sucesso! ✅');
        } else if (this.isCopyMode) {
          this.message.success('Carrada copiada e criada com sucesso! 📋✅');
        } else {
          this.message.success('Carrada criada com sucesso! 🎉');
        }
      },
      error: () => {
        this.isSaving = false;
        this.message.error('Erro ao gravar carrada. 🚫');
      }
    });
  }

  deleteCarload(carload: CarLoad): void {
    this.modal.confirm({
      nzTitle: 'Tens certeza que quer eliminar esta Carrada?',
      nzContent: `Cliente: <strong>${carload.customerName}</strong> — Destino: <strong>${carload.deliveryDestination}</strong>`,
      nzOkDanger: true,
      nzOkText: 'Sim',
      nzCancelText: 'Não',
      nzOnOk: () =>
        this.carloadService.deleteCarLoad(carload.id).subscribe({
          next: () => {
            this.message.success('Carrada eliminada com sucesso! 🗑️');
            this.loadCarloadsBySprint();
          },
          error: () => this.message.error('Erro ao eliminar carrada. 🚫')
        })
    });
  }

  onBack(): void {
    window.history.back();
  }

  // ========= Validators (igual ao carload) =========
  private applyDateRulesByStatus(): void {
    const status = this.selectedStatusUpper;

    const scheduledCtrl = this.carloadForm.get('deliveryScheduledDate')!;
    const deliveredCtrl = this.carloadForm.get('deliveredDate')!;

    scheduledCtrl.clearValidators();
    deliveredCtrl.clearValidators();

    if (status === 'SCHEDULED') {
      scheduledCtrl.setValidators([Validators.required]);
      deliveredCtrl.setValue('', { emitEvent: false });
    } else if (status === 'DELIVERED' || status === 'ENTREGUE') {
      deliveredCtrl.setValidators([Validators.required]);
    } else {
      scheduledCtrl.setValue('', { emitEvent: false });
      deliveredCtrl.setValue('', { emitEvent: false });
    }

    scheduledCtrl.updateValueAndValidity({ emitEvent: false });
    deliveredCtrl.updateValueAndValidity({ emitEvent: false });
  }

  // ========= Map/Date helpers =========
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
      carloadBatchId: this.sprintId,

      totalSpent: carload.totalSpent,
      totalEarnings: carload.totalEarnings,

      deliveryStatus: (carload.deliveryStatus as any) || 'PENDING',
      deliveryScheduledDate: this.toDatetimeLocalInput((carload as any).deliveryScheduledDate),
      deliveredDate: this.toDatetimeLocalInput((carload as any).deliveredDate)
    };
  }
}
