import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzModalService} from 'ng-zorro-antd/modal';
import {DriverService} from '@core/services/driver.service';
import {Driver} from '@shared/models/driver';

@Component({
  selector: 'app-driver',
  standalone: false,
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.scss']
})
export class DriverComponent implements OnInit {

  // ========= Data =========
  dataSource: Driver[] = [];
  listOfDisplayData: Driver[] = [];

  isSaving = false;
  isLoading = false;

  totalDrivers = 0;
  activeDrivers = 0;
  inactiveDrivers = 0;

  // ========= UI State =========
  searchValue = '';
  visible = false;

  isDriverDrawerVisible = false;

  // ========= Edit State =========
  isEditMode = false;
  driverDrawerTitle = 'Criar Motorista';
  selectedDriverId: string | null = null;
  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  // ✅ Details Drawer State
  isDriverDetailsVisible = false;
  selectedDriverDetails: Driver | null = null;
  detailsDrawerWidth: string | number = 560;
  detailsDrawerPlacement: 'right' | 'bottom' = 'right';

  // ✅ Opções de carros
  carOptions: string[] = [
    '4m3(DYNA)',
    '7m3(HINO-RANGER)',
    '18m3(TATA AMARELO)',
    '22m3(TATA SIGNA)',
    '24m3(SINOTRUK)'
  ];

  // ========= Forms =========
  driverForm = new FormGroup({
    Name: new FormControl('', Validators.required),
    Phone: new FormControl('', [Validators.required, Validators.pattern('^[+0-9 ]+$')]),
    CarDescription: new FormControl('', Validators.required),
    status: new FormControl('ACTIVO', Validators.required)
  });

  // ✅ Guardar o driver original para não perder id/createdAt no update
  private selectedDriver: Driver | null = null;

  constructor(
    private driverService: DriverService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {
  }

  ngOnInit(): void {
    this.getDrivers();
    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());
  }

  updateDrawer() {
    if (window.innerWidth <= 768) {
      this.drawerWidth = '100%';
      this.drawerPlacement = 'bottom';

      this.detailsDrawerWidth = '100%';
      this.detailsDrawerPlacement = 'bottom';
    } else {
      this.drawerWidth = 720;
      this.drawerPlacement = 'right';

      this.detailsDrawerWidth = 560;
      this.detailsDrawerPlacement = 'right';
    }
  }

  // ========= Driver Logic =========
  getDrivers() {
    this.isLoading = true;
    this.driverService.getDrivers().subscribe({
      next: (drivers) => {
        this.dataSource = drivers;
        this.listOfDisplayData = [...drivers];
        this.calculateStats();
        this.isLoading = false;
      },
      error: () => {
        this.message.error('Erro ao carregar motoristas. 🚫');
        this.isLoading = false;
      }
    });
  }

  calculateStats() {
    this.totalDrivers = this.dataSource.length;
    this.activeDrivers = this.dataSource.filter(d => d.status === 'ACTIVO' || d.status === 'ATIVO').length;
    this.inactiveDrivers = this.dataSource.filter(d => d.status !== 'ACTIVO' && d.status !== 'ATIVO').length;
  }

  applyFilters() {
    let data = [...this.dataSource];

    if (this.searchValue) {
      const v = this.searchValue.toLowerCase();
      data = data.filter(item =>
        (item.Name || '').toLowerCase().includes(v) ||
        (item.Phone || '').toLowerCase().includes(v) ||
        (item.CarDescription || '').toLowerCase().includes(v)
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

  // ========= Drawer CRUD =========
  openDriverDrawer() {
    this.isEditMode = false;
    this.driverDrawerTitle = 'Criar Motorista';

    this.selectedDriverId = null;
    this.selectedDriver = null;

    this.driverForm.reset({
      status: 'ACTIVO',
      CarDescription: null
    });

    this.isDriverDrawerVisible = true;
  }

  closeDriverDrawer() {
    if (this.isSaving) return;

    this.isDriverDrawerVisible = false;
    this.driverForm.reset();
    this.selectedDriverId = null;
    this.selectedDriver = null;
  }

  editDriver(driver: Driver) {
    this.isEditMode = true;
    this.driverDrawerTitle = 'Editar Motorista';

    this.selectedDriverId = driver.id;
    this.selectedDriver = driver;

    this.isDriverDrawerVisible = true;

    this.driverForm.patchValue({
      Name: driver.Name,
      Phone: driver.Phone,
      CarDescription: driver.CarDescription,
      status: driver.status
    });
  }

  saveDriver() {
    if (this.driverForm.invalid) {
      this.message.warning('Preencha todos os campos obrigatórios!');
      return;
    }

    this.isSaving = true;

    const formData: any = {...this.driverForm.value};

    // Normalizar phone para +258
    const rawPhone = (formData.Phone || '').toString().trim();
    formData.Phone = rawPhone.startsWith('+258') ? rawPhone : `+258 ${rawPhone}`;

    // ✅ No update, preserva campos fora do form (id, createdAt, etc.)
    const payload = (this.isEditMode && this.selectedDriver)
      ? {...this.selectedDriver, ...formData}
      : formData;

    const request$ = (this.isEditMode && this.selectedDriverId)
      ? this.driverService.updateDriver(this.selectedDriverId, payload)
      : this.driverService.addDriver(payload);

    request$.subscribe({
      next: () => {
        this.isSaving = false;

        this.getDrivers();
        this.closeDriverDrawer();

        this.message.success(this.isEditMode ? 'Motorista atualizado com sucesso! ✅' : 'Motorista criado com sucesso! 🎉');
      },
      error: () => {
        this.isSaving = false;
        this.message.error('Erro ao gravar motorista. 🚫');
      }
    });
  }

  deleteDriver(data: Driver) {
    this.modal.confirm({
      nzTitle: 'Tens certeza que quer eliminar este Motorista?',
      nzContent: `Motorista: <strong>${data.Name}</strong>`,
      nzOkText: 'Sim',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Não',
      nzOnOk: () =>
        this.driverService.deleteDriver(data.id).subscribe({
          next: () => {
            this.getDrivers();
            this.message.success('Motorista deletado com sucesso! 🗑️');
          },
          error: () => this.message.error('Erro ao deletar motorista. 🚫')
        })
    });
  }

  // ========= Details Drawer =========
  viewDriver(data: Driver) {
    this.selectedDriverDetails = data;
    this.isDriverDetailsVisible = true;
  }

  closeDriverDetails(): void {
    this.isDriverDetailsVisible = false;
    this.selectedDriverDetails = null;
  }

  editFromDetails(driver: Driver): void {
    this.closeDriverDetails();
    this.editDriver(driver);
  }

  deleteFromDetails(driver: Driver): void {
    this.closeDriverDetails();
    this.deleteDriver(driver);
  }

  // ========= Navigation =========
  onBack() {
    window.history.back();
  }
}
