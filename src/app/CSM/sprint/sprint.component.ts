import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzModalService} from 'ng-zorro-antd/modal';
import {Sprint} from '../../models/CSM/sprint';
import {SprintService} from '../../services/sprint.service';


@Component({
  selector: 'app-sprint',
  standalone: false,
  templateUrl: './sprint.component.html',
  styleUrls: ['./sprint.component.scss']
})
export class SprintComponent implements OnInit {

  // ========= Data =========
  dataSource: Sprint[] = [];
  listOfDisplayData: Sprint[] = [];

  isLoading = false;
  isSaving = false;

  totalSprints = 0;
  activeSprints = 0;
  inactiveSprints = 0;

  // ========= UI =========
  searchValue = '';
  visible = false;

  isSprintDrawerVisible = false;

  // ========= Edit =========
  isEditMode = false;
  sprintDrawerTitle = 'Criar Sprint';
  selectedSprintId: any | null = null;

  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  // ========= Form =========
  sprintForm = new FormGroup({
    code: new FormControl('', Validators.required),
    name: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    status: new FormControl('ACTIVO', Validators.required)
  });

  constructor(
    private sprintService: SprintService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {
  }

  ngOnInit(): void {
    this.getSprints();
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

  // ========= Logic =========
  getSprints() {
    this.isLoading = true;
    this.sprintService.getSprints().subscribe({
      next: (data) => {
        this.dataSource = data;
        this.listOfDisplayData = [...data];
        this.calculateStats();
        this.isLoading = false;
      },
      error: () => {
        this.message.error('Erro ao carregar sprints. 🚫');
        this.isLoading = false;
      }
    });
  }

  calculateStats() {
    this.totalSprints = this.dataSource.length;
    this.activeSprints = this.dataSource.filter(s => s.status === 'ACTIVO').length;
    this.inactiveSprints = this.dataSource.filter(s => s.status !== 'ACTIVO').length;
  }

  applyFilters() {
    let data = [...this.dataSource];

    if (this.searchValue) {
      const v = this.searchValue.toLowerCase();
      data = data.filter(s =>
        s.name.toLowerCase().includes(v) ||
        s.code.toLowerCase().includes(v) ||
        s.description.toLowerCase().includes(v)
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
  openSprintDrawer() {
    this.isEditMode = false;
    this.sprintDrawerTitle = 'Criar Sprint';
    this.sprintForm.reset({status: 'ACTIVO'});
    this.isSprintDrawerVisible = true;
  }

  closeSprintDrawer() {
    this.isSprintDrawerVisible = false;
    this.sprintForm.reset();
    this.selectedSprintId = null;
  }

  editSprint(sprint: Sprint) {
    this.isEditMode = true;
    this.sprintDrawerTitle = 'Editar Sprint';
    this.selectedSprintId = sprint.id;
    this.isSprintDrawerVisible = true;

    this.sprintForm.patchValue({
      code: sprint.code,
      name: sprint.name,
      description: sprint.description,
      status: sprint.status
    });
  }

  saveSprint() {
    if (this.sprintForm.invalid) {
      this.message.warning('Preencha todos os campos obrigatórios!');
      return;
    }

    this.isSaving = true;
    const formData = {...this.sprintForm.value};

    const request$ = this.isEditMode && this.selectedSprintId
      ? this.sprintService.updateSprint(this.selectedSprintId, formData)
      : this.sprintService.addSprint(formData);

    request$.subscribe({
      next: () => {
        this.getSprints();
        this.closeSprintDrawer();
        this.message.success(
          this.isEditMode ? 'Sprint atualizada com sucesso! ✅' : 'Sprint criada com sucesso! 🎉'
        );
        this.isSaving = false;
      },
      error: () => {
        this.message.error('Erro ao gravar sprint. 🚫');
        this.isSaving = false;
      }
    });
  }

  deleteSprint(data: Sprint) {
    this.modal.confirm({
      nzTitle: 'Tens certeza que quer eliminar esta Sprint?',
      nzContent: `Sprint: <strong>${data.name}</strong>`,
      nzOkDanger: true,
      nzOkText: 'Sim',
      nzCancelText: 'Não',
      nzOnOk: () =>
        this.sprintService.deleteSprint(data.id).subscribe({
          next: () => {
            this.getSprints();
            this.message.success('Sprint eliminada com sucesso! 🗑️');
          },
          error: () => this.message.error('Erro ao eliminar sprint. 🚫')
        })
    });
  }

  onBack() {
    window.history.back();
  }
}
