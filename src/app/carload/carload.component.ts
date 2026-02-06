import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { CarLoad } from '../models/CSM/carlaod';
import { CarloadService } from '../services/carload.service';

import { Driver } from '../models/CSM/driver';
import { Manager } from '../models/CSM/manager';
import { Sprint } from '../models/CSM/sprint';

import { DriverService } from '../services/driver.service';
import { ManagerService } from '../services/manager.service';
import { SprintService } from '../services/sprint.service';

type CarLoadStatus = 'SCHEDULED' | 'PENDING' | 'DELIVERED' | 'CANCELLED' | 'ENTREGUE' | string;

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

  // ========= Edit =========
  isEditMode = false;
  carLoadDrawerTitle = 'Criar Carrada';
  selectedCarLoadId: any | null = null;

  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  // ========= Form =========
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

    // ✅ backend enum
    deliveryStatus: new FormControl<CarLoadStatus>('PENDING', Validators.required),

    // ✅ vamos usar datetime-local no input, mas enviar ISO para LocalDateTime
    deliveryScheduledDate: new FormControl('', Validators.required)
  });

  constructor(
    private carLoadService: CarloadService,
    private driverService: DriverService,
    private managerService: ManagerService,
    private sprintService: SprintService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {}

  ngOnInit(): void {
    this.getCarLoads();
    this.loadLookups();

    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());
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

  // ========= Date helpers =========
  /**
   * Recebe:
   * - "YYYY-MM-DD" => "YYYY-MM-DDT00:00:00"
   * - "YYYY-MM-DDTHH:mm" => "YYYY-MM-DDTHH:mm:00"
   * - "YYYY-MM-DDTHH:mm:ss" => mantém
   */
  private normalizeDateTimeLocal(v: string | null | undefined): string | null {
    if (!v) return null;

    if (!v.includes('T')) return `${v}T00:00:00`;

    // "2026-02-06T11:30" -> add seconds
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return `${v}:00`;

    return v;
  }

  /**
   * Para preencher input type="datetime-local"
   * Recebe ISO do backend:
   * - "2026-02-06T11:13:04.022+02:00"
   * - "2026-02-06T11:13:04"
   * Retorna: "2026-02-06T11:13"
   */
  private toDatetimeLocalInput(iso: string | null | undefined): string {
    if (!iso) return '';
    // cortar timezone e ms
    const noZone = iso.replace('Z', '').split('+')[0].split('-')[0].length === 4
      ? iso.split('+')[0]
      : iso;

    // se vier com milissegundos: 2026-02-06T11:13:04.022
    const cleaned = noZone.split('.')[0];

    // se vier "2026-02-06" sem hora
    if (!cleaned.includes('T')) return `${cleaned}T00:00`;

    // "2026-02-06T11:13:04" -> "2026-02-06T11:13"
    return cleaned.substring(0, 16);
  }

  // ========= Status helpers (UI) =========
  getStatusLabel(status: CarLoadStatus): string {
    switch ((status || '').toUpperCase()) {
      case 'SCHEDULED': return 'Agendada';
      case 'PENDING': return 'Pendente';
      case 'DELIVERED': return 'Entregue';
      case 'ENTREGUE': return 'Entregue';
      case 'CANCELLED': return 'Cancelada';
      default: return status as string;
    }
  }

  isDelivered(status: CarLoadStatus): boolean {
    const s = (status || '').toUpperCase();
    return s === 'DELIVERED' || s === 'ENTREGUE';
  }

  // ========= Load lists for selects =========
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

  // ========= Logic =========
  getCarLoads() {
    this.isLoading = true;
    this.carLoadService.getCarLoads().subscribe({
      next: (data) => {
        this.dataSource = data;
        this.listOfDisplayData = [...data];
        this.calculateStats();
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

  applyFilters() {
    let data = [...this.dataSource];

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
    this.search();
  }

  // ========= Drawer =========
  openCarLoadDrawer() {
    this.isEditMode = false;
    this.carLoadDrawerTitle = 'Criar Carrada';

    this.carLoadForm.reset({
      deliveryStatus: 'PENDING',
      totalSpent: 0,
      totalEarnings: 0,
      deliveryScheduledDate: ''
    });

    if (!this.drivers.length || !this.managers.length || !this.sprints.length) {
      this.loadLookups();
    }

    this.isCarLoadDrawerVisible = true;
  }

  closeCarLoadDrawer() {
    this.isCarLoadDrawerVisible = false;
    this.carLoadForm.reset();
    this.selectedCarLoadId = null;
  }

  editCarLoad(carload: CarLoad) {
    this.isEditMode = true;
    this.carLoadDrawerTitle = 'Editar Carrada';
    this.selectedCarLoadId = carload.id;

    if (!this.drivers.length || !this.managers.length || !this.sprints.length) {
      this.loadLookups();
    }

    this.isCarLoadDrawerVisible = true;

    this.carLoadForm.patchValue({
      customerName: carload.customerName,
      customerPhoneNumber: carload.customerPhoneNumber,
      deliveryDestination: carload.deliveryDestination,

      transportedMaterial: carload.transportedMaterial,

      logisticsManagerId: carload.logisticsManagerId,
      assignedDriverId: carload.assignedDriverId,
      carloadBatchId: carload.carloadBatchId,

      totalSpent: carload.totalSpent,
      totalEarnings: carload.totalEarnings,

      deliveryStatus: (carload.deliveryStatus as any) || 'PENDING',

      // ✅ converter ISO do backend para datetime-local
      deliveryScheduledDate: this.toDatetimeLocalInput(carload.deliveryScheduledDate as any)
    });
  }

  saveCarLoad() {
    if (this.carLoadForm.invalid) {
      this.message.warning('Preencha todos os campos obrigatórios!');
      return;
    }

    this.isSaving = true;

    const formData: any = { ...this.carLoadForm.value };

    // Normalizar phone para +258
    const rawPhone = (formData.customerPhoneNumber || '').toString().trim();
    formData.customerPhoneNumber = rawPhone.startsWith('+258') ? rawPhone : `+258 ${rawPhone}`;

    // ✅ deliveryStatus (enum)
    formData.deliveryStatus = (formData.deliveryStatus || 'PENDING').toString().toUpperCase();

    // ✅ converter do input datetime-local para LocalDateTime (sem timezone)
    formData.deliveryScheduledDate = this.normalizeDateTimeLocal(formData.deliveryScheduledDate);

    const request$ = this.isEditMode && this.selectedCarLoadId
      ? this.carLoadService.updateCarLoad(this.selectedCarLoadId, formData)
      : this.carLoadService.addCarLoad(formData);

    request$.subscribe({
      next: () => {
        this.getCarLoads();
        this.closeCarLoadDrawer();
        this.message.success(this.isEditMode ? 'Carrada atualizada com sucesso! ✅' : 'Carrada criada com sucesso! 🎉');
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

  materials: string[] = [
    'Areia fina',
    'Areia grossa',
    'Areia vermelha',
    'Pedra 3/4',
    'Pedra sarrisca',
    'Pedra enrocamento'
  ];

}
