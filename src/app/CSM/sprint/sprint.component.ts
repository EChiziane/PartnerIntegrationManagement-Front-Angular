import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { Sprint } from '../../models/CSM/sprint';
import { SprintService } from '../../services/sprint.service';

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
  activeSprints = 0;   // EM_EXECUCAO
  inactiveSprints = 0; // ENCERRADO

  // ========= UI =========
  searchValue = '';

  isSprintDrawerVisible = false;

  // ========= Edit =========
  isEditMode = false;
  sprintDrawerTitle = 'Criar Sprint';
  selectedSprintId: string | null = null;

  // Guardar sprint original (id/createdAt etc.)
  private selectedSprint: Sprint | null = null;

  // Drawer responsive
  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  // ========= Form =========
  sprintForm = new FormGroup({
    code: new FormControl('', Validators.required),
    name: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    status: new FormControl<'EM_EXECUCAO' | 'ENCERRADO'>('EM_EXECUCAO', Validators.required)
  });

  constructor(
    private sprintService: SprintService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {}

  ngOnInit(): void {
    this.getSprints();
    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());
  }

  updateDrawer(): void {
    if (window.innerWidth <= 768) {
      this.drawerWidth = '100%';
      this.drawerPlacement = 'bottom';
    } else {
      this.drawerWidth = 720;
      this.drawerPlacement = 'right';
    }
  }

  // ========= Load =========
  getSprints(): void {
    this.isLoading = true;

    this.sprintService.getSprints().subscribe({
      next: (data) => {
        this.dataSource = data || [];
        this.listOfDisplayData = [...this.dataSource];
        this.calculateStats();
        this.isLoading = false;
      },
      error: () => {
        this.message.error('Erro ao carregar sprints. 🚫');
        this.isLoading = false;
      }
    });
  }

  calculateStats(): void {
    this.totalSprints = this.dataSource.length;
    this.activeSprints = this.dataSource.filter(s => s.status === 'EM_EXECUCAO').length;
    this.inactiveSprints = this.dataSource.filter(s => s.status === 'ENCERRADO').length;
  }

  // ========= Search =========
  private applyFilters(): void {
    let data = [...this.dataSource];

    const v = (this.searchValue || '').toLowerCase().trim();
    if (v) {
      data = data.filter(s =>
        (s.name || '').toLowerCase().includes(v) ||
        (s.code || '').toLowerCase().includes(v) ||
        (s.description || '').toLowerCase().includes(v) ||
        (s.status || '').toLowerCase().includes(v)
      );
    }

    this.listOfDisplayData = data;
  }

  search(): void {
    this.applyFilters();
  }

  // ========= Drawer =========
  openSprintDrawer(): void {
    this.isEditMode = false;
    this.sprintDrawerTitle = 'Criar Sprint';

    this.selectedSprintId = null;
    this.selectedSprint = null;

    this.sprintForm.reset({ status: 'EM_EXECUCAO' });
    this.isSprintDrawerVisible = true;
  }

  closeSprintDrawer(): void {
    if (this.isSaving) return;

    this.isSprintDrawerVisible = false;
    this.sprintForm.reset();
    this.selectedSprintId = null;
    this.selectedSprint = null;
  }

  editSprint(sprint: Sprint): void {
    this.isEditMode = true;
    this.sprintDrawerTitle = 'Editar Sprint';

    this.selectedSprintId = sprint.id;
    this.selectedSprint = sprint;

    this.isSprintDrawerVisible = true;

    this.sprintForm.patchValue({
      code: sprint.code,
      name: sprint.name,
      description: sprint.description,
      status: (sprint.status as any) || 'EM_EXECUCAO'
    });
  }

  saveSprint(): void {
    if (this.sprintForm.invalid) {
      this.message.warning('Preencha todos os campos obrigatórios!');
      return;
    }

    this.isSaving = true;

    const formData: any = { ...this.sprintForm.value };

    // Preservar campos fora do form (id/createdAt), se necessário
    const payload = (this.isEditMode && this.selectedSprint)
      ? { ...this.selectedSprint, ...formData }
      : formData;

    const request$ = (this.isEditMode && this.selectedSprintId)
      ? this.sprintService.updateSprint(this.selectedSprintId, payload)
      : this.sprintService.addSprint(payload);

    request$.subscribe({
      next: () => {
        // ✅ importante: desligar saving antes de fechar
        this.isSaving = false;

        this.getSprints();
        this.closeSprintDrawer();

        this.message.success(this.isEditMode
          ? 'Sprint atualizada com sucesso! ✅'
          : 'Sprint criada com sucesso! 🎉'
        );
      },
      error: () => {
        this.isSaving = false;
        this.message.error('Erro ao gravar sprint. 🚫');
      }
    });
  }

  deleteSprint(data: Sprint): void {
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

  onBack(): void {
    window.history.back();
  }
}
