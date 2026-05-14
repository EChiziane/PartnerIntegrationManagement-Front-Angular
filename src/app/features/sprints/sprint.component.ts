import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzModalService} from 'ng-zorro-antd/modal';
import {Sprint} from '@shared/models/sprint';
import {SprintService} from '@core/services/sprint.service';

@Component({
  selector: 'app-sprint',
  standalone: false,
  templateUrl: './sprint.component.html',
  styleUrls: ['./sprint.component.scss']
})
export class SprintComponent implements OnInit {

  dataSource: Sprint[] = [];
  listOfDisplayData: Sprint[] = [];

  currentEditingSprintId: string | null = null;

  isLoading = false;
  isSaving = false;

  totalSprints = 0;
  activeSprints = 0;
  inactiveSprints = 0;
  totalMarketingBudget = 0;

  searchValue = '';

  isSprintDrawerVisible = false;

  isEditMode = false;
  sprintDrawerTitle = 'Criar Campanha';
  selectedSprintId: string | null = null;
  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  sprintForm = new FormGroup({
    name: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    status: new FormControl<'PLANEADA' | 'EM_EXECUCAO' | 'PAUSADA' | 'ENCERRADO' | 'CANCELADA'>('EM_EXECUCAO', Validators.required),
    campaignChannel: new FormControl('FACEBOOK', Validators.required),
    materialFocus: new FormControl('', Validators.required),
    volumesPromoted: new FormControl<string[]>([]),
    campaignProducts: new FormControl(''),
    marketingBudget: new FormControl(0, [Validators.min(0)]),
    targetCarloads: new FormControl(0, [Validators.min(0)]),
    targetRevenue: new FormControl(0, [Validators.min(0)]),
    startDate: new FormControl<string | null>(null),
    expectedEndDate: new FormControl<string | null>(null)
  });
  private selectedSprint: Sprint | null = null;

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

  updateDrawer(): void {
    if (window.innerWidth <= 768) {
      this.drawerWidth = '100%';
      this.drawerPlacement = 'bottom';
    } else {
      this.drawerWidth = 720;
      this.drawerPlacement = 'right';
    }
  }

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
        this.message.error('Erro ao carregar sprints.');
        this.isLoading = false;
      }
    });
  }

  calculateStats(): void {
    this.totalSprints = this.dataSource.length;
    this.activeSprints = this.dataSource.filter(s => s.status === 'EM_EXECUCAO').length;
    this.inactiveSprints = this.dataSource.filter(s => s.status === 'ENCERRADO').length;
    this.totalMarketingBudget = this.dataSource.reduce((sum, sprint) => sum + Number(sprint.marketingBudget || 0), 0);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PLANEADA: 'Planeada',
      EM_EXECUCAO: 'Em execução',
      PAUSADA: 'Pausada',
      ENCERRADO: 'Encerrada',
      CANCELADA: 'Cancelada'
    };
    return labels[(status || '').toUpperCase()] || status;
  }

  getStatusColor(status: string): string {
    const value = (status || '').toUpperCase();
    if (value === 'EM_EXECUCAO') return 'green';
    if (value === 'PLANEADA') return 'blue';
    if (value === 'PAUSADA') return 'orange';
    if (value === 'CANCELADA') return 'red';
    return 'default';
  }

  search(): void {
    this.applyFilters();
  }

  openSprintDrawer(): void {
    this.isEditMode = false;
    this.sprintDrawerTitle = 'Criar Campanha';

    this.selectedSprintId = null;
    this.selectedSprint = null;

    this.sprintForm.reset({
      status: 'EM_EXECUCAO',
      campaignChannel: 'FACEBOOK',
      volumesPromoted: [],
      marketingBudget: 0,
      targetCarloads: 0,
      targetRevenue: 0
    });
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
    this.sprintDrawerTitle = 'Editar Campanha';

    this.selectedSprintId = sprint.id;
    this.selectedSprint = sprint;

    this.isSprintDrawerVisible = true;

    this.sprintForm.patchValue({
      name: sprint.name,
      description: sprint.description,
      status: (sprint.status as any) || 'EM_EXECUCAO',
      campaignChannel: sprint.campaignChannel || 'FACEBOOK',
      materialFocus: sprint.materialFocus || '',
      volumesPromoted: this.parseVolumes(sprint.volumesPromoted || sprint.campaignProducts || ''),
      campaignProducts: sprint.campaignProducts || '',
      marketingBudget: Number(sprint.marketingBudget || 0),
      targetCarloads: Number(sprint.targetCarloads || 0),
      targetRevenue: Number(sprint.targetRevenue || 0),
      startDate: sprint.startDate || null,
      expectedEndDate: sprint.expectedEndDate || null
    });
  }

  saveSprint(): void {
    if (this.sprintForm.invalid) {
      this.message.warning('Preencha todos os campos obrigatorios.');
      return;
    }

    this.isSaving = true;

    const formData: any = {...this.sprintForm.value};
    formData.volumesPromoted = Array.isArray(formData.volumesPromoted)
      ? formData.volumesPromoted.join(', ')
      : (formData.volumesPromoted || '');
    formData.campaignProducts = formData.volumesPromoted;

    // Preserva campos controlados pelo backend que nao fazem parte do formulario.
    const request$ = (this.isEditMode && this.selectedSprintId)
      ? this.sprintService.updateSprint(this.selectedSprintId, formData)
      : this.sprintService.addSprint(formData);

    request$.subscribe({
      next: () => {
        this.isSaving = false;

        this.getSprints();
        this.closeSprintDrawer();

        this.message.success(this.isEditMode
          ? 'Sprint atualizada com sucesso.'
          : 'Sprint criada com sucesso.'
        );
      },
      error: () => {
        this.isSaving = false;
        this.message.error('Erro ao gravar sprint.');
      }
    });
  }

  deleteSprint(data: Sprint): void {
    this.modal.confirm({
      nzTitle: 'Tens certeza que quer eliminar esta Sprint?',
      nzContent: `Sprint: <strong>${data.name}</strong>`,
      nzOkDanger: true,
      nzOkText: 'Sim',
      nzCancelText: 'Nao',
      nzOnOk: () =>
        this.sprintService.deleteSprint(data.id).subscribe({
          next: () => {
            this.getSprints();
            this.message.success('Sprint eliminada com sucesso.');
          },
          error: () => this.message.error('Erro ao eliminar sprint.')
        })
    });
  }

  onBack(): void {
    window.history.back();
  }

  private applyFilters(): void {
    let data = [...this.dataSource];

    const v = (this.searchValue || '').toLowerCase().trim();
    if (v) {
      data = data.filter(s =>
        (s.name || '').toLowerCase().includes(v) ||
        (s.code || '').toLowerCase().includes(v) ||
        (s.description || '').toLowerCase().includes(v) ||
        (s.status || '').toLowerCase().includes(v) ||
        (s.campaignChannel || '').toLowerCase().includes(v) ||
        (s.materialFocus || '').toLowerCase().includes(v) ||
        (s.volumesPromoted || '').toLowerCase().includes(v) ||
        (s.campaignProducts || '').toLowerCase().includes(v)
      );
    }

    this.listOfDisplayData = data;
  }

  private parseVolumes(value: string): string[] {
    return (value || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
}
