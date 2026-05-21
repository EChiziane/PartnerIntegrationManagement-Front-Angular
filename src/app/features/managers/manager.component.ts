import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {Manager} from '@shared/models/manager';
import {TranslationService} from '@core/services/translation.service';
import {ManagerService} from '@core/services/manager.service';
import {ConfirmationDialogService} from '@core/services/confirmation-dialog.service';

@Component({
  selector: 'app-manager',
  standalone: false,
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.scss']
})
export class ManagerComponent implements OnInit {

  dataSource: Manager[] = [];
  listOfDisplayData: Manager[] = [];

  isSaving = false;
  isLoading = false;

  totalManagers = 0;
  activeManagers = 0;
  inactiveManagers = 0;

  searchValue = '';
  visible = false;

  isManagerDrawerVisible = false;

  isEditMode = false;
  selectedManagerId: any | null = null;

  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  isManagerDetailsVisible = false;
  selectedManagerDetails: Manager | null = null;
  detailsDrawerWidth: string | number = 560;
  detailsDrawerPlacement: 'right' | 'bottom' = 'right';

  managerForm = new FormGroup({
    name: new FormControl('', Validators.required),
    contact: new FormControl('', [Validators.required, Validators.pattern('^[+0-9 ]+$')]),
    address: new FormControl('', [Validators.required, Validators.email]),
    status: new FormControl('ACTIVO', Validators.required)
  });

  constructor(
    private managerService: ManagerService,
    private message: NzMessageService,
    private confirmationDialog: ConfirmationDialogService,
    private translationService: TranslationService
  ) {
  }

  ngOnInit(): void {
    this.getManagers();
    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());
  }

  get managerDrawerTitle(): string {
    return this.isEditMode
      ? this.t('managers.drawer.editTitle')
      : this.t('managers.drawer.createTitle');
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

  getManagers() {
    this.isLoading = true;
    this.managerService.getManagers().subscribe({
      next: (managers) => {
        this.dataSource = managers;
        this.listOfDisplayData = [...managers];
        this.calculateStats();
        this.isLoading = false;
      },
      error: () => {
        this.message.error(this.t('managers.messages.loadError'));
        this.isLoading = false;
      }
    });
  }

  calculateStats() {
    this.totalManagers = this.dataSource.length;
    this.activeManagers = this.dataSource.filter(m => m.status === 'ACTIVO' || m.status === 'ATIVO').length;
    this.inactiveManagers = this.dataSource.filter(m => m.status !== 'ACTIVO' && m.status !== 'ATIVO').length;
  }

  applyFilters() {
    let data = [...this.dataSource];

    if (this.searchValue) {
      const v = this.searchValue.toLowerCase();
      data = data.filter(item =>
        (item.name || '').toLowerCase().includes(v) ||
        (item.contact || '').toLowerCase().includes(v) ||
        (item.address || '').toLowerCase().includes(v)
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

  openManagerDrawer() {
    this.isEditMode = false;
    this.selectedManagerId = null;

    this.managerForm.reset({status: 'ACTIVO'});
    this.isManagerDrawerVisible = true;
  }

  closeManagerDrawer() {
    if (this.isSaving) return;

    this.isManagerDrawerVisible = false;
    this.managerForm.reset();
    this.selectedManagerId = null;
  }

  editManager(manager: Manager) {
    this.isEditMode = true;
    this.selectedManagerId = manager.id;
    this.isManagerDrawerVisible = true;

    this.managerForm.patchValue({
      name: manager.name,
      contact: manager.contact,
      address: manager.address,
      status: manager.status
    });
  }

  saveManager() {
    if (this.managerForm.invalid) {
      this.message.warning('Preencha nome, telefone e email validos.');
      return;
    }

    this.isSaving = true;

    const formData: any = {...this.managerForm.value};

    // Normaliza o contacto para o formato usado pela API.
    const rawContact = (formData.contact || '').toString().trim();
    formData.contact = rawContact.startsWith('+258') ? rawContact : `+258 ${rawContact}`;

    const request$ = this.isEditMode && this.selectedManagerId
      ? this.managerService.updateManager(this.selectedManagerId, formData)
      : this.managerService.addManager(formData);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.getManagers();
        this.closeManagerDrawer();
        this.message.success(this.isEditMode ? 'Gestor atualizado com sucesso.' : 'Gestor criado com sucesso.');
      },
      error: () => {
        this.isSaving = false;
        this.message.error(this.t('managers.messages.saveError'));
      }
    });
  }

  deleteManager(data: Manager) {
    this.confirmationDialog.confirmDelete({
      entity: this.t('common.entities.manager'),
      name: data.name,
      onOk: () =>
        this.managerService.deleteManager(data.id).subscribe({
          next: () => {
            this.getManagers();
            this.message.success(this.t('managers.messages.deleted'));
          },
          error: () => this.message.error(this.t('managers.messages.deleteError'))
        })
    });
  }

  viewManager(data: Manager) {
    this.selectedManagerDetails = data;
    this.isManagerDetailsVisible = true;
  }

  closeManagerDetails(): void {
    this.isManagerDetailsVisible = false;
    this.selectedManagerDetails = null;
  }

  editFromDetails(manager: Manager): void {
    this.closeManagerDetails();
    this.editManager(manager);
  }

  deleteFromDetails(manager: Manager): void {
    this.closeManagerDetails();
    this.deleteManager(manager);
  }

  onBack() {
    window.history.back();
  }

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }
}
