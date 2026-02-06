import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzModalService} from 'ng-zorro-antd/modal';
import {Manager} from '../../models/CSM/manager';
import {ManagerService} from '../../services/manager.service';


@Component({
  selector: 'app-manager',
  standalone: false,
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.scss']
})
export class ManagerComponent implements OnInit {

  // ========= Data =========
  dataSource: Manager[] = [];
  listOfDisplayData: Manager[] = [];

  isSaving = false;
  isLoading = false;

  totalManagers = 0;
  activeManagers = 0;
  inactiveManagers = 0;

  // ========= UI State =========
  searchValue = '';
  visible = false;

  isManagerDrawerVisible = false;

  // ========= Edit State =========
  isEditMode = false;
  managerDrawerTitle = 'Criar Gestor';
  selectedManagerId: any | null = null;

  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  // ========= Forms =========
  managerForm = new FormGroup({
    name: new FormControl('', Validators.required),
    contact: new FormControl('', [Validators.required, Validators.pattern('^[+0-9 ]+$')]),
    address: new FormControl('', Validators.required),
    status: new FormControl('ACTIVO', Validators.required)
  });

  constructor(
    private managerService: ManagerService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {
  }

  ngOnInit(): void {
    this.getManagers();
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

  // ========= Manager Logic =========
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
        this.message.error('Erro ao carregar gestores. 🚫');
        this.isLoading = false;
      }
    });
  }

  calculateStats() {
    this.totalManagers = this.dataSource.length;
    this.activeManagers = this.dataSource.filter(m => m.status === 'ACTIVO').length;
    this.inactiveManagers = this.dataSource.filter(m => m.status !== 'ACTIVO').length;
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

  // ========= Drawer Controls =========
  openManagerDrawer() {
    this.isEditMode = false;
    this.managerDrawerTitle = 'Criar Gestor';
    this.managerForm.reset({status: 'ACTIVO'});
    this.isManagerDrawerVisible = true;
  }

  closeManagerDrawer() {
    this.isManagerDrawerVisible = false;
    this.managerForm.reset();
    this.selectedManagerId = null;
  }

  // ========= Edit/Create =========
  editManager(manager: Manager) {
    this.isEditMode = true;
    this.managerDrawerTitle = 'Editar Gestor';
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
      this.message.warning('Preencha todos os campos obrigatórios!');
      return;
    }

    this.isSaving = true;

    const formData = {...this.managerForm.value};

    // Normalizar contacto (opcional) para +258
    const rawContact = (formData.contact || '').toString().trim();
    formData.contact = rawContact.startsWith('+258') ? rawContact : `+258 ${rawContact}`;

    const request$ = this.isEditMode && this.selectedManagerId
      ? this.managerService.updateManager(this.selectedManagerId, formData)
      : this.managerService.addManager(formData);

    request$.subscribe({
      next: () => {
        this.getManagers();
        this.closeManagerDrawer();
        this.message.success(this.isEditMode ? 'Gestor atualizado com sucesso! ✅' : 'Gestor criado com sucesso! 🎉');
        this.isSaving = false;
      },
      error: () => {
        this.message.error('Erro ao gravar gestor. 🚫');
        this.isSaving = false;
      }
    });
  }

  deleteManager(data: Manager) {
    this.modal.confirm({
      nzTitle: 'Tens certeza que quer eliminar este Gestor?',
      nzContent: `Gestor: <strong>${data.name}</strong>`,
      nzOkText: 'Sim',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Não',
      nzOnOk: () =>
        this.managerService.deleteManager(data.id).subscribe({
          next: () => {
            this.getManagers();
            this.message.success('Gestor deletado com sucesso! 🗑️');
          },
          error: () => this.message.error('Erro ao deletar gestor. 🚫')
        })
    });
  }

  viewManager(data: Manager) {
    console.log('Visualizar gestor:', data);
  }

  onBack() {
    window.history.back();
  }
}
