import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {DriverService} from '@core/services/driver.service';
import {Driver} from '@shared/models/driver';
import {TranslationService} from '@core/services/translation.service';
import {Truck, TruckOwnershipType} from '@shared/models/truck';
import {TruckService} from '@core/services/truck.service';
import {ConfirmationDialogService} from '@core/services/confirmation-dialog.service';

@Component({
  selector: 'app-driver',
  standalone: false,
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.scss']
})
export class DriverComponent implements OnInit {

  dataSource: Driver[] = [];
  listOfDisplayData: Driver[] = [];
  trucks: Truck[] = [];

  isSaving = false;
  isLoading = false;

  totalDrivers = 0;
  activeDrivers = 0;
  inactiveDrivers = 0;

  searchValue = '';
  visible = false;

  isDriverDrawerVisible = false;

  isEditMode = false;
  selectedDriverId: string | null = null;
  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  isDriverDetailsVisible = false;
  selectedDriverDetails: Driver | null = null;
  detailsDrawerWidth: string | number = 560;
  detailsDrawerPlacement: 'right' | 'bottom' = 'right';

  truckMode: 'existing' | 'new' = 'existing';
  truckSizeOptions = [
    {size: '4m', brand: 'DYNA', description: '4m3(DYNA)'},
    {size: '7m', brand: 'HINO-RANGER', description: '7m3(HINO-RANGER)'},
    {size: '18m', brand: 'TATA AMARELO', description: '18m3(TATA AMARELO)'},
    {size: '22m', brand: 'TATA SIGNA', description: '22m3(TATA SIGNA)'},
    {size: '24m', brand: 'SINOTRUK', description: '24m3(SINOTRUK)'}
  ];

  driverForm = new FormGroup({
    Name: new FormControl('', Validators.required),
    Phone: new FormControl('', [Validators.required, Validators.pattern('^[+0-9 ]+$')]),
    CarDescription: new FormControl(''),
    status: new FormControl('ACTIVO', Validators.required),
    truckId: new FormControl<string | null>(null),
    truckPlateNumber: new FormControl(''),
    truckSize: new FormControl(''),
    truckBrand: new FormControl(''),
    truckDescription: new FormControl(''),
    truckOwnershipType: new FormControl<TruckOwnershipType>('EXTERNAL')
  });

  private selectedDriver: Driver | null = null;

  constructor(
    private driverService: DriverService,
    private truckService: TruckService,
    private message: NzMessageService,
    private confirmationDialog: ConfirmationDialogService,
    private translationService: TranslationService
  ) {
  }

  ngOnInit(): void {
    this.getDrivers();
    this.loadTrucks();
    this.driverForm.get('truckId')!.valueChanges.subscribe(value => this.onExistingTruckChange(value || null));
    this.driverForm.get('truckSize')!.valueChanges.subscribe(value => this.onTruckSizeChange(value || null));
    this.driverForm.get('truckBrand')!.valueChanges.subscribe(value => this.onTruckBrandChange(value || ''));
    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());
  }

  get driverDrawerTitle(): string {
    return this.isEditMode
      ? this.t('drivers.drawer.editTitle')
      : this.t('drivers.drawer.createTitle');
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
        this.message.error(this.t('drivers.messages.loadError'));
        this.isLoading = false;
      }
    });
  }

  loadTrucks(): void {
    this.truckService.getTrucks().subscribe({
      next: trucks => this.trucks = trucks || [],
      error: () => this.message.error('Erro ao carregar camioes.')
    });
  }

  get availableTrucks(): Truck[] {
    return this.trucks.filter(truck =>
      truck.assignedDriverId === this.selectedDriverId ||
      !truck.assignedDriverId
    );
  }

  get selectedTruckLabel(): string {
    const truckId = this.driverForm.get('truckId')?.value;
    const truck = this.trucks.find(item => item.id === truckId);
    return truck ? this.formatTruckLabel(truck) : '';
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
        (item.CarDescription || '').toLowerCase().includes(v) ||
        (item.truckPlateNumber || '').toLowerCase().includes(v)
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

  phoneHref(phone: string | null | undefined): string {
    const digits = (phone || '').toString().replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : 'tel:';
  }

  openDriverDrawer() {
    this.isEditMode = false;

    this.selectedDriverId = null;
    this.selectedDriver = null;
    this.truckMode = 'existing';
    this.resetDriverForm();

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

    this.selectedDriverId = driver.id;
    this.selectedDriver = driver;
    this.truckMode = driver.truckId ? 'existing' : 'new';

    this.isDriverDrawerVisible = true;

    this.driverForm.patchValue({
      Name: driver.Name,
      Phone: driver.Phone,
      CarDescription: driver.CarDescription,
      status: driver.status,
      truckId: driver.truckId || null,
      truckPlateNumber: driver.truckPlateNumber || '',
      truckSize: driver.truckSize || '',
      truckBrand: driver.truckBrand || '',
      truckDescription: driver.truckDescription || driver.CarDescription || '',
      truckOwnershipType: (driver.truckOwnershipType as TruckOwnershipType) || 'EXTERNAL'
    });
  }

  saveDriver() {
    if (this.driverForm.invalid || !this.hasValidTruckSelection()) {
      this.message.warning(this.t('drivers.messages.required'));
      return;
    }

    this.isSaving = true;

    const formData: any = {...this.driverForm.value};

    const rawPhone = (formData.Phone || '').toString().trim();
    formData.Phone = rawPhone.startsWith('+258') ? rawPhone : `+258 ${rawPhone}`;

    if (this.truckMode === 'existing') {
      formData.CarDescription = this.selectedTruckLabel || formData.CarDescription;
      formData.truckPlateNumber = null;
      formData.truckSize = null;
      formData.truckBrand = null;
      formData.truckDescription = null;
      formData.truckOwnershipType = null;
    } else {
      formData.truckId = null;
      this.applyTruckPresetToPayload(formData);
      formData.CarDescription = formData.truckDescription;
    }

    const payload = (this.isEditMode && this.selectedDriver)
      ? {...this.selectedDriver, ...formData}
      : formData;

    const request$ = (this.isEditMode && this.selectedDriverId)
      ? this.driverService.updateDriver(this.selectedDriverId, payload)
      : this.driverService.addDriver(payload);

    request$.subscribe({
      next: (savedDriver) => {
        this.isSaving = false;

        if (this.truckMode === 'new' && savedDriver?.id && !savedDriver.truckId) {
          this.createTruckFallback(savedDriver.id, formData);
          return;
        }

        this.finishDriverSave();
      },
      error: () => {
        this.isSaving = false;
        this.message.error(this.t('drivers.messages.saveError'));
      }
    });
  }

  deleteDriver(data: Driver) {
    this.confirmationDialog.confirmDelete({
      entity: this.t('common.entities.driver'),
      name: data.Name,
      onOk: () =>
        this.driverService.deleteDriver(data.id).subscribe({
          next: () => {
            this.getDrivers();
            this.loadTrucks();
            this.message.success(this.t('drivers.messages.deleted'));
          },
          error: () => this.message.error(this.t('drivers.messages.deleteError'))
        })
    });
  }

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

  changeTruckMode(mode: 'existing' | 'new'): void {
    this.truckMode = mode;
    this.driverForm.patchValue({
      truckId: null,
      truckPlateNumber: '',
      truckSize: '',
      truckBrand: '',
      truckDescription: '',
      truckOwnershipType: 'EXTERNAL',
      CarDescription: ''
    });
  }

  onExistingTruckChange(truckId: string | null): void {
    const truck = this.trucks.find(item => item.id === truckId);
    this.driverForm.patchValue({
      CarDescription: truck ? this.formatTruckLabel(truck) : ''
    });
  }

  onTruckSizeChange(size: string | null): void {
    const preset = this.truckSizeOptions.find(item => item.size === size);
    if (!preset) {
      this.driverForm.patchValue({
        truckBrand: '',
        truckDescription: '',
        CarDescription: ''
      });
      return;
    }

    this.driverForm.patchValue({
      truckBrand: preset.brand,
      truckDescription: preset.description,
      CarDescription: preset.description
    });
  }

  onTruckBrandChange(brand: string): void {
    const size = this.driverForm.get('truckSize')?.value || '';
    const description = this.buildTruckDescription(size, brand);
    this.driverForm.patchValue({
      truckDescription: description,
      CarDescription: description
    });
  }

  onBack() {
    window.history.back();
  }

  private resetDriverForm(): void {
    this.driverForm.reset({
      Name: '',
      Phone: '',
      status: 'ACTIVO',
      CarDescription: '',
      truckId: null,
      truckPlateNumber: '',
      truckSize: '',
      truckBrand: '',
      truckDescription: '',
      truckOwnershipType: 'EXTERNAL'
    });
  }

  private createTruckFallback(driverId: string, formData: any): void {
    this.isSaving = true;

    this.truckService.addTruck({
      plateNumber: formData.truckPlateNumber || '',
      truckSize: formData.truckSize || '',
      brand: formData.truckBrand || '',
      description: formData.truckDescription || '',
      availabilityStatus: 'ASSIGNED',
      ownershipType: formData.truckOwnershipType || 'EXTERNAL',
      assignedDriverId: driverId
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.finishDriverSave();
      },
      error: () => {
        this.isSaving = false;
        this.getDrivers();
        this.loadTrucks();
        this.message.warning('Motorista gravado, mas nao foi possivel criar o camiao associado.');
      }
    });
  }

  private finishDriverSave(): void {
    this.getDrivers();
    this.loadTrucks();
    this.closeDriverDrawer();
    this.message.success(this.isEditMode ? this.t('drivers.messages.updated') : this.t('drivers.messages.created'));
  }

  private hasValidTruckSelection(): boolean {
    if (this.truckMode === 'existing') {
      return !!this.driverForm.get('truckId')?.value;
    }

    return !!this.driverForm.get('truckSize')?.value;
  }

  private applyTruckPresetToPayload(formData: any): void {
    const preset = this.truckSizeOptions.find(item => item.size === formData.truckSize);
    formData.truckBrand = (formData.truckBrand || preset?.brand || '').trim();
    formData.truckDescription = this.buildTruckDescription(formData.truckSize, formData.truckBrand);
  }

  private buildTruckDescription(size: string | null | undefined, brand: string | null | undefined): string {
    const normalizedSize = this.normalizeTruckSize(size || '');
    const normalizedBrand = (brand || '').trim();

    if (!normalizedSize) {
      return normalizedBrand;
    }

    return normalizedBrand
      ? `${normalizedSize.replace('m', 'm3')}(${normalizedBrand.toUpperCase()})`
      : normalizedSize.replace('m', 'm3');
  }

  private normalizeTruckSize(value: string): string {
    const match = (value || '').match(/\d+/);
    return match ? `${match[0]}m` : value;
  }

  formatTruckLabel(truck: Truck): string {
    return this.formatTruckParts(truck.plateNumber, truck.truckSize, truck.brand, truck.description);
  }

  formatDriverTruckLabel(driver: Driver): string {
    return this.formatTruckParts(
      driver.truckPlateNumber,
      driver.truckSize,
      driver.truckBrand,
      driver.truckDescription || driver.CarDescription
    );
  }

  private formatTruckParts(
    plate?: string | null,
    size?: string | null,
    brand?: string | null,
    description?: string | null
  ): string {
    const normalizedPlate = plate || 'Sem matricula';
    const normalizedDescription = description || this.buildTruckDescription(size, brand || '');
    const normalizedSize = size || '';
    const normalizedBrand = brand || '';

    if (normalizedDescription) {
      return `${normalizedPlate} - ${normalizedDescription}`;
    }

    return [normalizedPlate, normalizedSize, normalizedBrand].filter(Boolean).join(' - ');
  }

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }
}
