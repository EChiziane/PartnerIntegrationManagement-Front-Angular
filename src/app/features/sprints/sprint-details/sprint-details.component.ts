import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzModalService} from 'ng-zorro-antd/modal';

import {CarLoad, CarLoadStatus} from '@shared/models/carload';
import {Driver} from '@shared/models/driver';
import {Manager} from '@shared/models/manager';
import {Sprint} from '@shared/models/sprint';

import {CarloadService} from '@core/services/carload.service';
import {DriverService} from '@core/services/driver.service';
import {ManagerService} from '@core/services/manager.service';
import {SprintService} from '@core/services/sprint.service';
import {SprintDetailPdfService} from '@core/services/sprint-detail-pdf.service';
import {TranslationService} from '@core/services/translation.service';

type FilterMode = 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';

@Component({
  selector: 'app-sprint-details',
  standalone: false,
  templateUrl: './sprint-details.component.html',
  styleUrls: ['./sprint-details.component.scss']
})
export class SprintDetailsComponent implements OnInit {
  sprintId!: string;
  sprintName = '';
  sprint: Sprint | null = null;

  allCarloads: CarLoad[] = [];
  listOfDisplayData: CarLoad[] = [];

  isLoading = false;
  isSaving = false;

  totalCarloads = 0;
  totalAgendados = 0;
  totalEntregue = 0;
  totalEmExecucao = 0;
  totalCanceladas = 0;
  totalRevenue = 0;
  totalSpent = 0;
  grossProfit = 0;
  netProfit = 0;
  roi = 0;
  targetCarloadProgress = 0;
  targetRevenueProgress = 0;
  topMaterial = '-';
  topVolume = '-';
  volumeDistribution: Array<{ volume: string; count: number; revenue: number }> = [];

  dataDrivers: Driver[] = [];
  dataManagers: Manager[] = [];
  isLoadingLookups = false;

  searchValue = '';
  filterMode: FilterMode = 'ALL';
  dateRange: Date[] | null = null;

  isCarloadDrawerVisible = false;
  isEditMode = false;
  isCopyMode = false;
  carLoadDrawerTitle = '';
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

  carloadForm = new FormGroup({
    customerName: new FormControl('', Validators.required),
    customerPhoneNumber: new FormControl('', [Validators.required, Validators.pattern('^[+0-9 ]+$')]),
    deliveryDestination: new FormControl('', Validators.required),
    transportedMaterial: new FormControl('', Validators.required),

    logisticsManagerId: new FormControl('', Validators.required),
    assignedDriverId: new FormControl('', Validators.required),
    carloadBatchId: new FormControl('', Validators.required),

    totalSpent: new FormControl(0, [Validators.required, Validators.min(0)]),
    totalEarnings: new FormControl(0, [Validators.required, Validators.min(0)]),

    deliveryStatus: new FormControl<CarLoadStatus>('SCHEDULED', Validators.required),
    deliveryScheduledDate: new FormControl<string | null>(''),
    deliveryDate: new FormControl<string | null>(''),
  });

  constructor(
    private route: ActivatedRoute,
    private carloadService: CarloadService,
    private driverService: DriverService,
    private managerService: ManagerService,
    private sprintService: SprintService,
    private sprintDetailPdfService: SprintDetailPdfService,
    private modal: NzModalService,
    private message: NzMessageService,
    private translationService: TranslationService
  ) {
  }

  get selectedStatusUpper(): string {
    return (this.carloadForm.get('deliveryStatus')?.value || 'SCHEDULED').toString().toUpperCase();
  }

  get shouldShowScheduledDate(): boolean {
    return this.selectedStatusUpper === 'SCHEDULED';
  }

  get shouldShowDeliveredDate(): boolean {
    return this.selectedStatusUpper === 'DELIVERED';
  }

  get marketingBudget(): number {
    return Number(this.sprint?.marketingBudget || 0);
  }

  get targetCarloads(): number {
    return Number(this.sprint?.targetCarloads || 0);
  }

  get targetRevenue(): number {
    return Number(this.sprint?.targetRevenue || 0);
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

  getStatusLabel(status: CarLoadStatus | string): string {
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

  getTagColor(status: CarLoadStatus | string): string {
    const value = (status || '').toUpperCase();
    if (value === 'DELIVERED') return 'green';
    if (value === 'SCHEDULED') return 'blue';
    if (value === 'CANCELLED') return 'red';
    if (value === 'IN_PROGRESS') return 'orange';
    return 'default';
  }

  loadLookups(): void {
    this.isLoadingLookups = true;

    this.driverService.getDrivers().subscribe({
      next: data => (this.dataDrivers = data || []),
      error: () => this.message.error(this.t('sprints.messages.loadDriversError'))
    });

    this.managerService.getManagers().subscribe({
      next: data => (this.dataManagers = data || []),
      error: () => this.message.error(this.t('sprints.messages.loadManagersError'))
    });

    setTimeout(() => (this.isLoadingLookups = false), 400);
  }

  loadCarloadsBySprint(): void {
    this.isLoading = true;

    this.carloadService.getCarloadsBySprint(this.sprintId).subscribe({
      next: data => {
        this.allCarloads = data || [];
        this.calculateStats();
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.message.error(this.t('sprints.messages.loadCarloadsError'));
        this.isLoading = false;
      }
    });
  }

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

  openCarloadDrawer(): void {
    this.isEditMode = false;
    this.isCopyMode = false;
    this.selectedCarLoadId = null;
    this.carLoadDrawerTitle = this.t('carloads.drawer.createTitle');

    this.carloadForm.reset({
      deliveryStatus: 'SCHEDULED',
      totalSpent: 0,
      totalEarnings: 0,
      deliveryScheduledDate: '',
      deliveryDate: '',
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
      deliveryStatus: 'SCHEDULED',
      totalSpent: 0,
      totalEarnings: 0,
      carloadBatchId: this.sprintId
    });
  }

  editCarload(carload: CarLoad): void {
    this.isEditMode = true;
    this.isCopyMode = false;
    this.selectedCarLoadId = carload.id;
    this.carLoadDrawerTitle = this.t('carloads.drawer.editTitle');

    this.isCarloadDrawerVisible = true;
    this.carloadForm.patchValue(this.mapCarloadToForm(carload));
    this.carloadForm.patchValue({carloadBatchId: this.sprintId});

    this.applyDateRulesByStatus();
  }

  copyCarLoad(carload: CarLoad): void {
    this.isEditMode = false;
    this.isCopyMode = true;
    this.selectedCarLoadId = null;
    this.carLoadDrawerTitle = this.t('carloads.drawer.copyTitle');

    this.isCarloadDrawerVisible = true;
    this.carloadForm.patchValue(this.mapCarloadToForm(carload));
    this.carloadForm.patchValue({
      carloadBatchId: this.sprintId,
      deliveryStatus: 'SCHEDULED',
      deliveryScheduledDate: '',
      deliveryDate: ''
    });

    this.applyDateRulesByStatus();
  }

  submitCarload(): void {
    this.applyDateRulesByStatus();

    if (this.carloadForm.invalid) {
      this.message.warning(this.t('sprints.messages.required'));
      return;
    }

    this.isSaving = true;

    const formData: any = {...this.carloadForm.value};
    formData.carloadBatchId = this.sprintId;

    const rawPhone = (formData.customerPhoneNumber || '').toString().trim();
    formData.customerPhoneNumber = rawPhone.startsWith('+258') ? rawPhone : `+258 ${rawPhone}`;

    formData.deliveryStatus = (formData.deliveryStatus || 'SCHEDULED').toString().toUpperCase();

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
          this.message.success(this.t('sprints.messages.updated'));
        } else if (this.isCopyMode) {
          this.message.success(this.t('sprints.messages.copied'));
        } else {
          this.message.success(this.t('sprints.messages.created'));
        }
      },
      error: () => {
        this.isSaving = false;
        this.message.error(this.t('sprints.messages.saveError'));
      }
    });
  }

  deleteCarload(carload: CarLoad): void {
    this.modal.confirm({
      nzTitle: this.t('sprints.messages.deleteTitle'),
      nzContent: this.t('carloads.modal.deleteContent', {customer: carload.customerName, destination: carload.deliveryDestination}),
      nzOkDanger: true,
      nzOkText: this.t('common.yes'),
      nzCancelText: this.t('common.no'),
      nzOnOk: () =>
        this.carloadService.deleteCarLoad(carload.id).subscribe({
          next: () => {
            this.message.success(this.t('sprints.messages.deleted'));
            this.loadCarloadsBySprint();
          },
          error: () => this.message.error(this.t('sprints.messages.deleteError'))
        })
    });
  }

  onBack(): void {
    window.history.back();
  }

  downloadSprintPdf(): void {
    this.sprintDetailPdfService.downloadSprintReport(this.sprint, this.sprintName, this.listOfDisplayData, {
      totalCarloads: this.totalCarloads,
      totalAgendados: this.totalAgendados,
      totalEntregue: this.totalEntregue,
      totalRevenue: this.totalRevenue,
      totalSpent: this.totalSpent,
      netProfit: this.netProfit,
      roi: this.roi,
      targetCarloads: this.targetCarloads,
      targetRevenue: this.targetRevenue,
      targetCarloadProgress: this.targetCarloadProgress,
      targetRevenueProgress: this.targetRevenueProgress,
      topVolume: this.topVolume
    });
  }

  private loadSprintName(): void {
    this.sprintService.getSprintById(this.sprintId).subscribe({
      next: sprint => {
        this.sprint = sprint || null;
        this.sprintName = sprint?.name || '';
        this.calculateStats();
      },
      error: () => {
        this.sprint = null;
        this.sprintName = '';
      }
    });
  }

  private calculateStats(): void {
    this.totalCarloads = this.allCarloads.length;

    const up = (value: any) => (value || '').toString().toUpperCase();

    this.totalAgendados = this.allCarloads.filter(c => up(c.deliveryStatus) === 'SCHEDULED').length;
    this.totalEntregue = this.allCarloads.filter(c => up(c.deliveryStatus) === 'DELIVERED').length;
    this.totalEmExecucao = this.allCarloads.filter(c => up(c.deliveryStatus) === 'IN_PROGRESS').length;
    this.totalCanceladas = this.allCarloads.filter(c => up(c.deliveryStatus) === 'CANCELLED').length;
    this.totalRevenue = this.allCarloads.reduce((sum, item) => sum + Number(item.totalEarnings || 0), 0);
    this.totalSpent = this.allCarloads.reduce((sum, item) => sum + Number(item.totalSpent || 0), 0);
    this.grossProfit = this.totalRevenue - this.totalSpent;
    this.netProfit = this.grossProfit - this.marketingBudget;
    this.roi = this.marketingBudget > 0 ? (this.netProfit / this.marketingBudget) * 100 : 0;
    this.targetCarloadProgress = this.targetCarloads > 0 ? Math.min((this.totalEntregue / this.targetCarloads) * 100, 100) : 0;
    this.targetRevenueProgress = this.targetRevenue > 0 ? Math.min((this.totalRevenue / this.targetRevenue) * 100, 100) : 0;
    this.topMaterial = this.sprint?.materialFocus || this.calculateTopMaterial();
    this.volumeDistribution = this.calculateVolumeDistribution();
    this.topVolume = this.volumeDistribution.length
      ? `${this.volumeDistribution[0].volume} (${this.volumeDistribution[0].count})`
      : '-';
  }

  private calculateTopMaterial(): string {
    const counts = new Map<string, number>();

    this.allCarloads
      .filter(item => (item.deliveryStatus || '').toString().toUpperCase() !== 'CANCELLED')
      .forEach(item => {
        const material = item.transportedMaterial || 'Sem material';
        counts.set(material, (counts.get(material) || 0) + 1);
      });

    const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return top ? `${top[0]} (${top[1]})` : '-';
  }

  private calculateVolumeDistribution(): Array<{ volume: string; count: number; revenue: number }> {
    const volumes = new Map<string, { count: number; revenue: number }>();

    this.allCarloads
      .filter(item => (item.deliveryStatus || '').toString().toUpperCase() !== 'CANCELLED')
      .forEach(item => {
        const volume = this.extractVolume(item.transportedMaterial || '');
        const current = volumes.get(volume) || {count: 0, revenue: 0};
        volumes.set(volume, {
          count: current.count + 1,
          revenue: current.revenue + Number(item.totalEarnings || 0)
        });
      });

    return [...volumes.entries()]
      .map(([volume, data]) => ({volume, ...data}))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue);
  }

  private extractVolume(material: string): string {
    const match = material.match(/(\d+)\s*m/i);
    return match ? `${match[1]}m` : 'Sem volume';
  }

  private applyFilter(): void {
    let filtered = [...this.allCarloads];
    const up = (value: any) => (value || '').toString().toUpperCase();

    if (this.filterMode !== 'ALL') {
      filtered = filtered.filter(c => up(c.deliveryStatus) === this.filterMode);
    }

    if (this.dateRange && this.dateRange.length === 2) {
      const [start, end] = this.dateRange;
      if (start && end) {
        const startDate = new Date(start).setHours(0, 0, 0, 0);
        const endDate = new Date(end).setHours(23, 59, 59, 999);

        filtered = filtered.filter(c => {
          const rawDate = c.deliveryScheduledDate || c.createdAt;
          const time = new Date(rawDate || '').getTime();
          return time >= startDate && time <= endDate;
        });
      }
    }

    const value = (this.searchValue || '').toLowerCase().trim();
    if (value) {
      filtered = filtered.filter(item =>
        (item.customerName || '').toLowerCase().includes(value) ||
        (item.customerPhoneNumber || '').toLowerCase().includes(value) ||
        (item.deliveryDestination || '').toLowerCase().includes(value) ||
        (item.transportedMaterial || '').toLowerCase().includes(value) ||
        (item.assignedDriverName || '').toLowerCase().includes(value)
      );
    }

    this.listOfDisplayData = filtered;
  }

  private applyDateRulesByStatus(): void {
    const status = this.selectedStatusUpper;

    const scheduledCtrl = this.carloadForm.get('deliveryScheduledDate')!;
    const deliveredCtrl = this.carloadForm.get('deliveryDate')!;

    scheduledCtrl.clearValidators();
    deliveredCtrl.clearValidators();

    if (status === 'SCHEDULED') {
      scheduledCtrl.setValidators([Validators.required]);
      deliveredCtrl.setValue('', {emitEvent: false});
    } else if (status === 'DELIVERED') {
      deliveredCtrl.setValidators([Validators.required]);
    } else {
      scheduledCtrl.setValue('', {emitEvent: false});
      deliveredCtrl.setValue('', {emitEvent: false});
    }

    scheduledCtrl.updateValueAndValidity({emitEvent: false});
    deliveredCtrl.updateValueAndValidity({emitEvent: false});
  }

  private normalizeDateTimeLocal(value: string | null | undefined): string | null {
    if (!value) return null;
    if (!value.includes('T')) return `${value}T00:00:00`;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return `${value}:00`;
    return value;
  }

  private toDatetimeLocalInput(value: string | null | undefined): string {
    if (!value) return '';
    const withoutZone = value.replace('Z', '').split('+')[0];
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
      deliveryStatus: carload.deliveryStatus || 'SCHEDULED',
      deliveryScheduledDate: this.toDatetimeLocalInput(carload.deliveryScheduledDate),
      deliveryDate: this.toDatetimeLocalInput(carload.deliveryDate)
    };
  }

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }
}
