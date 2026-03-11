import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { CarLoad, CarLoadStatus } from '../../../models/CSM/carlaod';
import { Driver } from '../../../models/CSM/driver';
import { Manager } from '../../../models/CSM/manager';

import { CarloadService } from '../../../services/carload.service';
import { DriverService } from '../../../services/driver.service';
import { ManagerService } from '../../../services/manager.service';
import { SprintService } from '../../../services/sprint.service';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  allCarloads: CarLoad[] = [];
  listOfDisplayData: CarLoad[] = [];

  isLoading = false;
  isSaving = false;

  totalCarloads = 0;
  totalAgendados = 0;
  totalEntregue = 0;
  totalEmExecucao = 0;
  totalCanceladas = 0;

  dataDrivers: Driver[] = [];
  dataManagers: Manager[] = [];
  isLoadingLookups = false;

  searchValue = '';
  filterMode: FilterMode = 'ALL';
  dateRange: Date[] | null = null;

  isCarloadDrawerVisible = false;
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
    private modal: NzModalService,
    private message: NzMessageService
  ) {}

  get selectedStatusUpper(): string {
    return (this.carloadForm.get('deliveryStatus')?.value || 'SCHEDULED').toString().toUpperCase();
  }

  get shouldShowScheduledDate(): boolean {
    return this.selectedStatusUpper === 'SCHEDULED';
  }

  get shouldShowDeliveredDate(): boolean {
    return this.selectedStatusUpper === 'DELIVERED';
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
      error: () => this.message.error('Erro ao carregar motoristas.')
    });

    this.managerService.getManagers().subscribe({
      next: data => (this.dataManagers = data || []),
      error: () => this.message.error('Erro ao carregar gestores.')
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
        this.message.error('Erro ao carregar carradas desta sprint.');
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
    this.carLoadDrawerTitle = 'Criar Carrada';

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
    this.carLoadDrawerTitle = 'Editar Carrada';

    this.isCarloadDrawerVisible = true;
    this.carloadForm.patchValue(this.mapCarloadToForm(carload));
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
      this.message.warning('Preencha todos os campos obrigatórios.');
      return;
    }

    this.isSaving = true;

    const formData: any = { ...this.carloadForm.value };
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
          this.message.success('Carrada actualizada com sucesso.');
        } else if (this.isCopyMode) {
          this.message.success('Carrada copiada e criada com sucesso.');
        } else {
          this.message.success('Carrada criada com sucesso.');
        }
      },
      error: () => {
        this.isSaving = false;
        this.message.error('Erro ao gravar carrada.');
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
            this.message.success('Carrada eliminada com sucesso.');
            this.loadCarloadsBySprint();
          },
          error: () => this.message.error('Erro ao eliminar carrada.')
        })
    });
  }

  onBack(): void {
    window.history.back();
  }

  downloadSprintPdf(): void {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const generatedAt = new Date();

    const formatDate = (value: string | null | undefined): string => {
      if (!value) return '—';

      const date = new Date(value);
      if (isNaN(date.getTime())) return '—';

      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const mi = String(date.getMinutes()).padStart(2, '0');

      return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
    };

    const formatMoney = (value: number | null | undefined): string => {
      return `${Number(value || 0).toFixed(2)} Mts`;
    };

    pdf.setFontSize(18);
    pdf.setTextColor(40, 40, 40);
    pdf.text('Relatório da Sprint', 14, 18);

    pdf.setFontSize(11);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Sprint: ${this.sprintName || 'N/D'}`, 14, 26);
    pdf.text(`Gerado em: ${formatDate(generatedAt.toISOString())}`, pageWidth - 70, 26);

    pdf.setDrawColor(230, 230, 230);
    pdf.line(14, 30, pageWidth - 14, 30);

    pdf.setFontSize(11);
    pdf.setTextColor(60, 60, 60);
    pdf.text(`Total: ${this.totalCarloads}`, 14, 38);
    pdf.text(`Agendadas: ${this.totalAgendados}`, 44, 38);
    pdf.text(`Em execução: ${this.totalEmExecucao}`, 86, 38);
    pdf.text(`Entregues: ${this.totalEntregue}`, 138, 38);
    pdf.text(`Canceladas: ${this.totalCanceladas}`, 14, 45);

    const rows = this.listOfDisplayData.map(item => [
      item.customerName || '—',
      item.customerPhoneNumber || '—',
      item.deliveryDestination || '—',
      item.transportedMaterial || '—',
      item.assignedDriverName || '—',
      this.getStatusLabel(item.deliveryStatus),
      formatDate(item.deliveryScheduledDate),
      formatDate(item.deliveryDate),
      formatMoney(item.totalEarnings),
      formatMoney(item.totalSpent)
    ]);

    autoTable(pdf, {
      startY: 52,
      head: [[
        'Cliente',
        'Contacto',
        'Destino',
        'Material',
        'Motorista',
        'Estado',
        'Agendado',
        'Entregue',
        'Ganhos',
        'Gastos'
      ]],
      body: rows,
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        valign: 'middle',
        textColor: [50, 50, 50]
      },
      headStyles: {
        fillColor: [0, 123, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      margin: { left: 10, right: 10 },
      didDrawPage: () => {
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text('Transportes Chiziane · Documento gerado pelo sistema', 14, pageHeight - 8);
      }
    });

    const safeSprintName = (this.sprintName || 'sprint')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    pdf.save(`sprint_${safeSprintName}.pdf`);
  }

  private loadSprintName(): void {
    this.sprintService.getSprintById(this.sprintId).subscribe({
      next: sprint => (this.sprintName = sprint?.name || ''),
      error: () => (this.sprintName = '')
    });
  }

  private calculateStats(): void {
    this.totalCarloads = this.allCarloads.length;

    const up = (value: any) => (value || '').toString().toUpperCase();

    this.totalAgendados = this.allCarloads.filter(c => up(c.deliveryStatus) === 'SCHEDULED').length;
    this.totalEntregue = this.allCarloads.filter(c => up(c.deliveryStatus) === 'DELIVERED').length;
    this.totalEmExecucao = this.allCarloads.filter(c => up(c.deliveryStatus) === 'IN_PROGRESS').length;
    this.totalCanceladas = this.allCarloads.filter(c => up(c.deliveryStatus) === 'CANCELLED').length;
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
      deliveredCtrl.setValue('', { emitEvent: false });
    } else if (status === 'DELIVERED') {
      deliveredCtrl.setValidators([Validators.required]);
    } else {
      scheduledCtrl.setValue('', { emitEvent: false });
      deliveredCtrl.setValue('', { emitEvent: false });
    }

    scheduledCtrl.updateValueAndValidity({ emitEvent: false });
    deliveredCtrl.updateValueAndValidity({ emitEvent: false });
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
}
