import {Component, OnInit} from '@angular/core';
import {FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ProductPriceService} from '@core/services/product-price.service';
import {CommercialCatalogPdfService} from '@core/services/commercial-catalog-pdf.service';
import {CommercialCatalogService} from '@core/services/commercial-catalog.service';
import {COMMERCIAL_CATALOGS} from '@shared/data/commercial-catalogs';
import {CatalogMaterialView, CatalogView, CommercialCatalog} from '@shared/models/commercial-catalog';
import {ProductPrice} from '@shared/models/product-price';
import {COMPANY_PROFILE} from '@shared/data/company-profile';
import {TranslationService} from '@core/services/translation.service';

@Component({
  selector: 'app-commercial-catalog',
  standalone: false,
  templateUrl: './commercial-catalog.component.html',
  styleUrls: ['./commercial-catalog.component.scss']
})
export class CommercialCatalogComponent implements OnInit {
  catalogs = COMMERCIAL_CATALOGS;
  selectedCatalogId = this.catalogs[0]?.id;
  catalogView?: CatalogView;
  loading = false;
  saving = false;
  isDrawerVisible = false;
  catalogForm!: FormGroup;
  errorMessage = '';
  company = COMPANY_PROFILE;
  readonly canEditCatalog = this.isAdminUser();

  constructor(
    private productPriceService: ProductPriceService,
    private commercialCatalogService: CommercialCatalogService,
    private catalogPdfService: CommercialCatalogPdfService,
    private translationService: TranslationService,
    private fb: FormBuilder
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.loadCatalogs();
  }

  selectCatalog(catalogId: string): void {
    this.selectedCatalogId = catalogId;
    this.loadCatalog();
  }

  async downloadCatalog(): Promise<void> {
    if (!this.catalogView) return;
    await this.catalogPdfService.download(this.catalogView);
  }

  printPage(): void {
    window.print();
  }

  priceFor(material: CatalogMaterialView): string {
    return this.money(material.price ?? material.fallbackPrice);
  }

  text(key: string): string {
    return this.translationService.instant(key);
  }

  catalogText(catalog: CatalogView | CommercialCatalog, field: string): string {
    return this.translatedOrValue(`${catalog.i18nKey}.${field}`, (catalog as any)[field]);
  }

  materialText(material: CatalogMaterialView, field: string): string {
    return this.translatedOrValue(`${material.i18nKey}.${field}`, (material as any)[field]);
  }

  materialList(material: CatalogMaterialView, field: 'applications' | 'benefits'): string[] {
    const value = this.translationService.instant(`${material.i18nKey}.${field}`);
    return value.includes('|') ? value.split('|') : material[field];
  }

  get materialControls(): FormArray {
    return this.catalogForm.get('materials') as FormArray;
  }

  get productionControls(): FormArray {
    return this.catalogForm.get('production') as FormArray;
  }

  openEditDrawer(): void {
    if (!this.catalogView) return;
    this.catalogForm.patchValue({
      code: this.catalogView.code || this.catalogView.id,
      i18nKey: this.catalogView.i18nKey,
      title: this.catalogView.title,
      vehicleName: this.catalogView.vehicleName,
      vehicleModel: this.catalogView.vehicleModel,
      audience: this.catalogView.audience,
      volume: this.catalogView.volume,
      volumeM3: this.catalogView.volumeM3,
      wheelbarrows: this.catalogView.wheelbarrows,
      equivalent4mTrucks: this.catalogView.equivalent4mTrucks,
      equivalent7mTrucks: this.catalogView.equivalent7mTrucks,
      heroImageUrl: this.catalogView.heroImageUrl,
      vehicleImageUrl: this.catalogView.vehicleImageUrl,
      productionImageUrl: this.catalogView.productionImageUrl,
      wheelbarrowImageUrl: this.catalogView.wheelbarrowImageUrl,
      contactImageUrl: this.catalogView.contactImageUrl,
      heroLine: this.catalogView.heroLine,
      promise: this.catalogView.promise,
      active: this.catalogView.active ?? true,
      displayOrder: this.catalogView.displayOrder ?? 0
    });

    this.materialControls.clear();
    this.catalogView.materials.forEach(material => this.materialControls.push(this.createMaterialGroup(material)));

    this.productionControls.clear();
    this.catalogView.production.forEach(item => this.productionControls.push(this.createProductionGroup(item)));

    this.isDrawerVisible = true;
  }

  closeEditDrawer(): void {
    if (this.saving) return;
    this.isDrawerVisible = false;
  }

  saveCatalog(): void {
    if (!this.catalogView || this.catalogForm.invalid) {
      this.catalogForm.markAllAsTouched();
      return;
    }

    const payload = {
      ...this.catalogView,
      ...this.catalogForm.value,
      materials: this.catalogForm.value.materials.map((item: any, index: number) => ({
        ...item,
        fallbackPrice: Number(item.price || 0),
        price: Number(item.price || 0),
        applications: this.linesToArray(item.applicationsText),
        benefits: this.linesToArray(item.benefitsText),
        displayOrder: index + 1
      })),
      production: this.catalogForm.value.production.map((item: any, index: number) => ({
        ...item,
        displayOrder: index + 1
      }))
    } as CommercialCatalog;

    this.saving = true;
    this.commercialCatalogService.updateCatalog(this.catalogView.id, payload).subscribe({
      next: catalog => {
        const normalized = this.normalizeCatalog(catalog);
        this.catalogs = this.catalogs.map(item => item.id === normalized.id ? normalized : item);
        this.selectedCatalogId = normalized.id;
        this.catalogView = this.buildCatalogView(normalized, []);
        this.isDrawerVisible = false;
        this.saving = false;
      },
      error: () => {
        this.errorMessage = 'Nao foi possivel gravar o catálogo agora.';
        this.saving = false;
      }
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  private loadCatalogs(): void {
    this.loading = true;
    this.commercialCatalogService.getActiveCatalogs().subscribe({
      next: catalogs => {
        this.catalogs = catalogs.length ? catalogs.map(catalog => this.normalizeCatalog(catalog)) : COMMERCIAL_CATALOGS;
        this.selectedCatalogId = this.catalogs[0]?.id;
        this.loadCatalog();
      },
      error: () => {
        this.catalogs = COMMERCIAL_CATALOGS;
        this.selectedCatalogId = this.catalogs[0]?.id;
        this.loadCatalog();
      }
    });
  }

  private loadCatalog(): void {
    const catalog = this.catalogs.find(item => item.id === this.selectedCatalogId) || this.catalogs[0];
    if (!catalog) return;

    this.loading = true;
    this.errorMessage = '';

    this.productPriceService.getActivePrices().subscribe({
      next: prices => {
        this.catalogView = this.buildCatalogView(catalog, prices);
        this.loading = false;
      },
      error: () => {
        this.catalogView = this.buildCatalogView(catalog, []);
        this.errorMessage = this.translationService.instant('commercialCatalog.messages.priceError');
        this.loading = false;
      }
    });
  }

  private buildCatalogView(catalog: CommercialCatalog, prices: ProductPrice[]): CatalogView {
    const materialViews = catalog.materials.map(material => ({
      ...material,
      fallbackPrice: material.fallbackPrice ?? material.price ?? 0,
      productPrice: prices.find(price =>
        price.truckVolume === catalog.volume &&
        this.normalize(price.materialName) === this.normalize(material.materialName)
      )
    }));

    return {
      ...catalog,
      materialViews
    };
  }

  private normalizeCatalog(catalog: CommercialCatalog): CommercialCatalog {
    return {
      ...catalog,
      i18nKey: catalog.i18nKey || '',
      materials: (catalog.materials || []).map(material => ({
        ...material,
        i18nKey: material.i18nKey || '',
        imageTone: material.imageTone || 'sand',
        fallbackPrice: material.fallbackPrice ?? material.price ?? 0,
        applications: material.applications || [],
        benefits: material.benefits || []
      })),
      production: catalog.production || []
    };
  }

  private createForm(): void {
    this.catalogForm = this.fb.group({
      code: ['', Validators.required],
      i18nKey: [''],
      title: ['', Validators.required],
      vehicleName: ['', Validators.required],
      vehicleModel: ['', Validators.required],
      audience: [''],
      volume: ['', Validators.required],
      volumeM3: [0, Validators.required],
      wheelbarrows: [0, Validators.required],
      equivalent4mTrucks: [0],
      equivalent7mTrucks: [0],
      heroImageUrl: [''],
      vehicleImageUrl: [''],
      productionImageUrl: [''],
      wheelbarrowImageUrl: [''],
      contactImageUrl: [''],
      heroLine: [''],
      promise: [''],
      active: [true],
      displayOrder: [0],
      materials: this.fb.array([]),
      production: this.fb.array([])
    });
  }

  private createMaterialGroup(material: CatalogMaterialView): FormGroup {
    return this.fb.group({
      id: [material.id],
      i18nKey: [material.i18nKey],
      materialName: [material.materialName, Validators.required],
      title: [material.title, Validators.required],
      subtitle: [material.subtitle],
      originNote: [material.originNote],
      imageTone: [material.imageTone],
      imageUrl: [material.imageUrl],
      secondaryImageUrl: [material.secondaryImageUrl || ''],
      price: [material.price ?? material.fallbackPrice, Validators.required],
      applicationsText: [(material.applications || []).join('\n')],
      benefitsText: [(material.benefits || []).join('\n')],
      active: [material.active ?? true],
      displayOrder: [material.displayOrder ?? 0]
    });
  }

  private createProductionGroup(item: any): FormGroup {
    return this.fb.group({
      id: [item.id],
      title: [item.title, Validators.required],
      measure: [item.measure],
      ratio: [item.ratio],
      output: [item.output],
      active: [item.active ?? true],
      displayOrder: [item.displayOrder ?? 0]
    });
  }

  private linesToArray(value: string): string[] {
    return (value || '')
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  private translatedOrValue(key: string, fallback: string): string {
    if (fallback) return fallback;
    const translated = this.translationService.instant(key);
    return translated === key ? fallback : translated;
  }

  private isAdminUser(): boolean {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) return false;

    try {
      return JSON.parse(rawUser)?.role === 'ADMIN';
    } catch {
      return false;
    }
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }

  private money(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'Sob consulta';
    return `MT ${Number(value).toLocaleString('pt-MZ', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }
}
