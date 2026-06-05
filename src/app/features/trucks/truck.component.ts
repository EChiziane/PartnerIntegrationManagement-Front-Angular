import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {Truck, TruckAvailabilityStatus, TruckOwnershipType} from '@shared/models/truck';
import {Driver} from '@shared/models/driver';
import {TruckService} from '@core/services/truck.service';
import {DriverService} from '@core/services/driver.service';
import {TranslationService} from '@core/services/translation.service';
import {ConfirmationDialogService} from '@core/services/confirmation-dialog.service';

@Component({
  selector: 'app-truck',
  standalone: false,
  templateUrl: './truck.component.html',
  styleUrls: ['./truck.component.scss']
})
export class TruckComponent implements OnInit {
  trucks: Truck[] = [];
  filteredTrucks: Truck[] = [];
  drivers: Driver[] = [];

  isLoading = false;
  isSaving = false;
  searchValue = '';

  totalTrucks = 0;
  availableTrucks = 0;
  externalTrucks = 0;

  isDrawerVisible = false;
  isEditMode = false;
  isCopyMode = false;
  selectedTruckId: string | null = null;
  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';
  truckSizeOptions = [
    {size: '4m', brand: 'DYNA', description: '4m3(DYNA)'},
    {size: '7m', brand: 'HINO-RANGER', description: '7m3(HINO-RANGER)'},
    {size: '18m', brand: 'TATA AMARELO', description: '18m3(TATA AMARELO)'},
    {size: '22m', brand: 'TATA SIGNA', description: '22m3(TATA SIGNA)'},
    {size: '24m', brand: 'SINOTRUK', description: '24m3(SINOTRUK)'}
  ];

  truckForm = new FormGroup({
    plateNumber: new FormControl(''),
    truckSize: new FormControl('', Validators.required),
    brand: new FormControl(''),
    description: new FormControl(''),
    availabilityStatus: new FormControl<TruckAvailabilityStatus>('AVAILABLE', Validators.required),
    ownershipType: new FormControl<TruckOwnershipType>('EXTERNAL', Validators.required),
    assignedDriverId: new FormControl<string | null>(null)
  });

  constructor(
    private truckService: TruckService,
    private driverService: DriverService,
    private message: NzMessageService,
    private confirmationDialog: ConfirmationDialogService,
    private translationService: TranslationService
  ) {
  }

  ngOnInit(): void {
    this.loadTrucks();
    this.loadDrivers();
    this.truckForm.get('truckSize')!.valueChanges.subscribe(value => this.onTruckSizeChange(value || ''));
    this.truckForm.get('brand')!.valueChanges.subscribe(value => this.onTruckBrandChange(value || ''));
    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());
  }

  get availableDrivers(): Driver[] {
    return this.drivers.filter(driver => {
      const assignedTruck = this.trucks.find(truck => truck.assignedDriverId === driver.id);
      return !assignedTruck || assignedTruck.id === this.selectedTruckId;
    });
  }

  get drawerTitle(): string {
    if (this.isCopyMode) {
      return this.t('trucks.drawer.copyTitle');
    }

    return this.isEditMode
      ? this.t('trucks.drawer.editTitle')
      : this.t('trucks.drawer.createTitle');
  }

  updateDrawer(): void {
    if (window.innerWidth <= 768) {
      this.drawerWidth = '100%';
      this.drawerPlacement = 'right';
    } else {
      this.drawerWidth = 720;
      this.drawerPlacement = 'right';
    }
  }

  loadTrucks(): void {
    this.isLoading = true;
    this.truckService.getTrucks().subscribe({
      next: trucks => {
        this.trucks = trucks || [];
        this.syncTruckDriverNames();
        this.calculateStats();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.message.error('Erro ao carregar camioes.');
      }
    });
  }

  loadDrivers(): void {
    this.driverService.getDrivers().subscribe({
      next: drivers => {
        this.drivers = drivers || [];
        this.syncTruckDriverNames();
        this.applyFilters();
      },
      error: () => this.message.error('Erro ao carregar motoristas.')
    });
  }

  calculateStats(): void {
    this.totalTrucks = this.trucks.length;
    this.availableTrucks = this.trucks.filter(truck => truck.availabilityStatus === 'AVAILABLE').length;
    this.externalTrucks = this.trucks.filter(truck => truck.ownershipType === 'EXTERNAL').length;
  }

  search(): void {
    this.applyFilters();
  }

  reset(): void {
    this.searchValue = '';
    this.applyFilters();
  }

  applyFilters(): void {
    const value = this.searchValue.toLowerCase().trim();
    this.filteredTrucks = value
      ? this.trucks.filter(truck =>
        (truck.plateNumber || '').toLowerCase().includes(value) ||
        (truck.truckSize || '').toLowerCase().includes(value) ||
        (truck.brand || '').toLowerCase().includes(value) ||
        (truck.description || '').toLowerCase().includes(value) ||
        (truck.assignedDriverName || '').toLowerCase().includes(value)
      )
      : [...this.trucks];
  }

  openDrawer(): void {
    this.isEditMode = false;
    this.isCopyMode = false;
    this.selectedTruckId = null;
    this.truckForm.reset({
      availabilityStatus: 'AVAILABLE',
      ownershipType: 'EXTERNAL',
      assignedDriverId: null
    });
    this.isDrawerVisible = true;
  }

  editTruck(truck: Truck): void {
    this.isEditMode = true;
    this.isCopyMode = false;
    this.selectedTruckId = truck.id;
    this.truckForm.patchValue({
      plateNumber: truck.plateNumber || '',
      truckSize: truck.truckSize,
      brand: truck.brand || '',
      description: truck.description || '',
      availabilityStatus: truck.availabilityStatus || 'AVAILABLE',
      ownershipType: truck.ownershipType || 'EXTERNAL',
      assignedDriverId: truck.assignedDriverId || null
    });
    this.isDrawerVisible = true;
  }

  copyTruck(truck: Truck): void {
    this.isEditMode = false;
    this.isCopyMode = true;
    this.selectedTruckId = null;
    this.truckForm.reset({
      plateNumber: '',
      truckSize: truck.truckSize,
      brand: truck.brand || '',
      description: truck.description || '',
      availabilityStatus: 'AVAILABLE',
      ownershipType: truck.ownershipType || 'EXTERNAL',
      assignedDriverId: null
    });
    this.isDrawerVisible = true;
  }

  closeDrawer(): void {
    if (this.isSaving) return;
    this.isDrawerVisible = false;
    this.selectedTruckId = null;
    this.isCopyMode = false;
    this.truckForm.reset();
  }

  saveTruck(): void {
    if (this.truckForm.invalid) {
      this.message.warning('Preencha os campos obrigatorios.');
      return;
    }

    this.isSaving = true;
    const raw = this.truckForm.value;
    const truckDescription = this.buildTruckDescription(raw.truckSize || '', raw.brand || '');
    const derivedStatus = raw.availabilityStatus === 'INACTIVE' || raw.availabilityStatus === 'IN_MAINTENANCE'
      ? raw.availabilityStatus
      : (raw.assignedDriverId ? 'ASSIGNED' : 'AVAILABLE');
    const payload: Partial<Truck> = {
      plateNumber: raw.plateNumber || '',
      truckSize: raw.truckSize || '',
      brand: raw.brand || '',
      description: raw.description || truckDescription,
      availabilityStatus: derivedStatus,
      ownershipType: raw.ownershipType || 'EXTERNAL',
      assignedDriverId: raw.assignedDriverId || null
    };
    const request$ = this.isEditMode && this.selectedTruckId
      ? this.truckService.updateTruck(this.selectedTruckId, payload)
      : this.truckService.addTruck(payload);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.loadTrucks();
        this.loadDrivers();
        this.closeDrawer();
        this.message.success(this.isEditMode ? 'Camiao atualizado com sucesso.' : (this.isCopyMode ? 'Copia do camião criada com sucesso.' : 'Camiao criado com sucesso.'));
      },
      error: () => {
        this.isSaving = false;
        this.message.error('Erro ao gravar camião.');
      }
    });
  }

  deleteTruck(truck: Truck): void {
    this.confirmationDialog.confirmDelete({
      entity: this.t('common.entities.truck'),
      name: truck.plateNumber || truck.description || truck.truckSize,
      onOk: () => this.truckService.deleteTruck(truck.id).subscribe({
        next: () => {
          this.loadTrucks();
          this.loadDrivers();
          this.message.success(this.t('trucks.messages.deleted'));
        },
        error: () => this.message.error(this.t('trucks.messages.deleteError'))
      })
    });
  }

  getStatusColor(status: TruckAvailabilityStatus): string {
    if (status === 'AVAILABLE') return 'green';
    if (status === 'ASSIGNED') return 'blue';
    if (status === 'IN_MAINTENANCE') return 'orange';
    return 'red';
  }

  onBack(): void {
    window.history.back();
  }

  onTruckSizeChange(size: string): void {
    const preset = this.truckSizeOptions.find(option => option.size === size);
    if (!preset) {
      return;
    }

    this.truckForm.patchValue({
      brand: preset.brand,
      description: preset.description
    }, {emitEvent: false});
  }

  onTruckBrandChange(brand: string): void {
    const size = this.truckForm.get('truckSize')?.value || '';
    this.truckForm.patchValue({
      description: this.buildTruckDescription(size, brand)
    }, {emitEvent: false});
  }

  private buildTruckDescription(size: string, brand: string): string {
    const match = (size || '').match(/\d+/);
    const normalizedSize = match ? `${match[0]}m` : size;
    const normalizedBrand = (brand || '').trim();

    if (!normalizedSize) {
      return normalizedBrand;
    }

    return normalizedBrand
      ? `${normalizedSize.replace('m', 'm3')}(${normalizedBrand.toUpperCase()})`
      : normalizedSize.replace('m', 'm3');
  }

  private syncTruckDriverNames(): void {
    if (!this.trucks.length || !this.drivers.length) {
      return;
    }

    this.trucks = this.trucks.map(truck => {
      if (!truck.assignedDriverId) {
        return truck;
      }

      const driver = this.drivers.find(item => item.id === truck.assignedDriverId);
      return driver
        ? {...truck, assignedDriverName: driver.Name}
        : truck;
    });
  }

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }
}
