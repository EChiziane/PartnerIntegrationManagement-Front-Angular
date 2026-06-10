import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {ProductPrice} from '@shared/models/product-price';
import {ProductPriceService} from '@core/services/product-price.service';
import {ConfirmationDialogService} from '@core/services/confirmation-dialog.service';
import {ProductPriceListPdfService} from '@core/services/product-price-list-pdf.service';

@Component({
  selector: 'app-product-price',
  standalone: false,
  templateUrl: './product-price.component.html',
  styleUrls: ['./product-price.component.scss']
})
export class ProductPriceComponent implements OnInit {
  prices: ProductPrice[] = [];
  filteredPrices: ProductPrice[] = [];
  isLoading = false;
  isSaving = false;
  searchValue = '';
  selectedVolumes: string[] = [];
  selectedMaterial = 'ALL';
  isDrawerVisible = false;
  isEditMode = false;
  selectedPriceId: string | null = null;
  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  priceForm = new FormGroup({
    code: new FormControl(''),
    label: new FormControl('', Validators.required),
    truckVolume: new FormControl('', Validators.required),
    materialName: new FormControl('', Validators.required),
    salePrice: new FormControl(0, [Validators.required, Validators.min(0)]),
    driverCost: new FormControl(0, [Validators.min(0)]),
    active: new FormControl(true),
    notes: new FormControl('')
  });

  constructor(
    private priceService: ProductPriceService,
    private message: NzMessageService,
    private confirmationDialog: ConfirmationDialogService,
    private priceListPdfService: ProductPriceListPdfService
  ) {
  }

  get volumes(): string[] {
    return Array.from(new Set(this.prices.map(item => item.truckVolume).filter(Boolean))).sort(this.sortVolume);
  }

  get materials(): string[] {
    return Array.from(new Set(this.prices.map(item => item.materialName).filter(Boolean))).sort();
  }

  get activePrices(): number {
    return this.prices.filter(item => item.active).length;
  }

  get highestPrice(): number {
    return this.prices.reduce((highest, item) => Math.max(highest, Number(item.salePrice || 0)), 0);
  }

  get drawerTitle(): string {
    return this.isEditMode ? 'Editar preco' : 'Novo produto';
  }

  ngOnInit(): void {
    this.loadPrices();
    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());

    this.priceForm.get('truckVolume')?.valueChanges.subscribe(() => this.syncCodeAndLabel());
    this.priceForm.get('materialName')?.valueChanges.subscribe(() => this.syncCodeAndLabel());
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

  loadPrices(): void {
    this.isLoading = true;
    this.priceService.getPrices().subscribe({
      next: prices => {
        this.prices = prices || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.message.error('Erro ao carregar catálogo de preços.');
      }
    });
  }

  applyFilters(): void {
    const query = this.searchValue.trim().toLowerCase();

    this.filteredPrices = this.prices.filter(item => {
      const matchesSearch = !query
        || (item.code || '').toLowerCase().includes(query)
        || (item.label || '').toLowerCase().includes(query)
        || (item.materialName || '').toLowerCase().includes(query);
      const matchesVolume = !this.selectedVolumes.length || this.selectedVolumes.includes(item.truckVolume);
      const matchesMaterial = this.selectedMaterial === 'ALL' || item.materialName === this.selectedMaterial;

      return matchesSearch && matchesVolume && matchesMaterial;
    });
  }

  onVolumeFilterChange(values: string[]): void {
    this.selectedVolumes = values || [];
    this.applyFilters();
  }

  onMaterialFilterChange(value: string): void {
    this.selectedMaterial = value;
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchValue = '';
    this.selectedVolumes = [];
    this.selectedMaterial = 'ALL';
    this.applyFilters();
  }

  openDrawer(): void {
    this.isEditMode = false;
    this.selectedPriceId = null;
    this.priceForm.reset({
      code: '',
      label: '',
      truckVolume: '',
      materialName: '',
      salePrice: 0,
      driverCost: 0,
      active: true,
      notes: ''
    });
    this.isDrawerVisible = true;
  }

  editPrice(price: ProductPrice): void {
    this.isEditMode = true;
    this.selectedPriceId = price.id;
    this.priceForm.patchValue({
      code: price.code,
      label: price.label,
      truckVolume: price.truckVolume,
      materialName: price.materialName,
      salePrice: Number(price.salePrice || 0),
      driverCost: Number(price.driverCost || 0),
      active: price.active,
      notes: price.notes || ''
    });
    this.isDrawerVisible = true;
  }

  closeDrawer(): void {
    if (this.isSaving) return;
    this.isDrawerVisible = false;
    this.selectedPriceId = null;
    this.priceForm.reset();
  }

  savePrice(): void {
    if (this.priceForm.invalid) {
      this.message.warning('Preencha os campos obrigatorios.');
      return;
    }

    this.isSaving = true;
    const raw = this.priceForm.value;
    const payload: Partial<ProductPrice> = {
      code: raw.code || this.buildCode(raw.truckVolume || '', raw.materialName || ''),
      label: raw.label || `${raw.truckVolume} ${raw.materialName}`,
      truckVolume: raw.truckVolume || '',
      materialName: raw.materialName || '',
      salePrice: Number(raw.salePrice || 0),
      driverCost: Number(raw.driverCost || 0),
      active: raw.active ?? true,
      notes: raw.notes || ''
    };

    const request$ = this.isEditMode && this.selectedPriceId
      ? this.priceService.updatePrice(this.selectedPriceId, payload)
      : this.priceService.addPrice(payload);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeDrawer();
        this.loadPrices();
        this.message.success(this.isEditMode ? 'Preco atualizado.' : 'Produto criado.');
      },
      error: () => {
        this.isSaving = false;
        this.message.error('Erro ao gravar preco.');
      }
    });
  }

  deletePrice(price: ProductPrice): void {
    this.confirmationDialog.confirmDelete({
      entity: 'preco',
      name: price.label,
      details: 'Esta acao remove o produto do catálogo. Documentos antigos nao serao alterados.',
      onOk: () => this.priceService.deletePrice(price.id).subscribe({
        next: () => {
          this.loadPrices();
          this.message.success('Preco removido.');
        },
        error: () => this.message.error('Erro ao remover preco.')
      })
    });
  }

  formatMoney(value: number | null | undefined): string {
    return Number(value || 0).toFixed(2);
  }

  printPriceList(): void {
    if (!this.filteredPrices.length) {
      this.message.warning('Nao ha preços para imprimir.');
      return;
    }

    this.priceListPdfService.downloadPriceList(this.filteredPrices);
  }

  onBack(): void {
    window.history.back();
  }

  private syncCodeAndLabel(): void {
    const volume = this.priceForm.get('truckVolume')?.value || '';
    const material = this.priceForm.get('materialName')?.value || '';

    if (!volume || !material) return;

    const code = this.buildCode(volume, material);
    const label = `${volume} ${material}`;

    this.priceForm.patchValue({code, label}, {emitEvent: false});
  }

  private buildCode(volume: string, material: string): string {
    return `M${volume.replace(/[^0-9]/g, '')}_${this.normalizeMaterialCode(material)}`;
  }

  private normalizeMaterialCode(material: string): string {
    return material
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace('/', '_')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .toUpperCase()
      .replace('PO_PEDRA', 'PO_DE_PEDRA')
      .replace('PEDRA_34', 'PEDRA_3_4');
  }

  private sortVolume(a: string, b: string): number {
    return Number(a.replace(/[^0-9]/g, '')) - Number(b.replace(/[^0-9]/g, ''));
  }
}
