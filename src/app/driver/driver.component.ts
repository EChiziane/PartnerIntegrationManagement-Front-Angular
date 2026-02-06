import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import {DriverService} from '../services/driver.service';
import {Driver} from '../models/CSM/driver';


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
  selectedDriverId: any | null = null;

  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  // ========= Forms =========
  driverForm = new FormGroup({
    Name: new FormControl('', Validators.required),
    Phone: new FormControl('', [Validators.required, Validators.pattern('^[+0-9 ]+$')]),
    CarDescription: new FormControl('', Validators.required),
    status: new FormControl('ATIVO', Validators.required)
  });

  constructor(
    private driverService: DriverService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {}

  ngOnInit(): void {
    this.getDrivers();
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
    this.activeDrivers = this.dataSource.filter(d => d.status === 'ATIVO').length;
    this.inactiveDrivers = this.dataSource.filter(d => d.status !== 'ATIVO').length;
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

  openDriverDrawer() {
    this.isEditMode = false;
    this.driverDrawerTitle = 'Criar Motorista';
    this.driverForm.reset({ status: 'ATIVO' });
    this.isDriverDrawerVisible = true;
  }

  closeDriverDrawer() {
    this.isDriverDrawerVisible = false;
    this.driverForm.reset();
    this.selectedDriverId = null;
  }

  editDriver(driver: Driver) {
    this.isEditMode = true;
    this.driverDrawerTitle = 'Editar Motorista';
    this.selectedDriverId = driver.id;
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

    const formData = { ...this.driverForm.value };

    // Normalizar phone (opcional) para +258
    const rawPhone = (formData.Phone || '').toString().trim();
    formData.Phone = rawPhone.startsWith('+258') ? rawPhone : `+258 ${rawPhone}`;

    const request$ = this.isEditMode && this.selectedDriverId
      ? this.driverService.updateDriver(this.selectedDriverId, formData)
      : this.driverService.addDriver(formData);

    request$.subscribe({
      next: () => {
        this.getDrivers();
        this.closeDriverDrawer();
        this.message.success(this.isEditMode ? 'Motorista atualizado com sucesso! ✅' : 'Motorista criado com sucesso! 🎉');
        this.isSaving = false;
      },
      error: () => {
        this.message.error('Erro ao gravar motorista. 🚫');
        this.isSaving = false;
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

  viewDriver(data: Driver) {
    console.log('Visualizar motorista:', data);
  }

  onBack() {
    window.history.back();
  }
}
