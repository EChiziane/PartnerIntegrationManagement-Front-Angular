import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {Sprint} from '@shared/models/sprint';
import {SprintService} from '@core/services/sprint.service';
import {TranslationService} from '@core/services/translation.service';
import {ConfirmationDialogService} from '@core/services/confirmation-dialog.service';

@Component({
  selector: 'app-sprint',
  standalone: false,
  templateUrl: './sprint.component.html',
  styleUrls: ['./sprint.component.scss']
})
export class SprintComponent implements OnInit {
  @ViewChild('descriptionEditor') descriptionEditor?: ElementRef<HTMLDivElement>;

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
  isCopyMode = false;
  selectedSprintId: string | null = null;
  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  sprintForm = new FormGroup({
    name: new FormControl('', Validators.required),
    description: new FormControl('', [Validators.required, Validators.maxLength(5000)]),
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
    private confirmationDialog: ConfirmationDialogService,
    private translationService: TranslationService
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

  get sprintDrawerTitle(): string {
    if (this.isCopyMode) {
      return this.t('sprints.drawer.copyTitle');
    }

    return this.isEditMode
      ? this.t('sprints.drawer.editTitle')
      : this.t('sprints.drawer.createTitle');
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

  get isAdminUser(): boolean {
    return this.getCurrentUserRole() === 'ADMIN';
  }

  getStatusClass(status: string): string {
    return `status-${(status || 'PLANEADA').toString().toLowerCase().replace('_', '-')}`;
  }

  getAvailableStatusTransitions(sprint: Sprint): string[] {
    if (this.isAdminUser) {
      return ['PLANEADA', 'EM_EXECUCAO', 'PAUSADA', 'ENCERRADO', 'CANCELADA']
        .filter(status => status !== sprint.status);
    }

    switch ((sprint.status || '').toUpperCase()) {
      case 'PLANEADA':
        return ['EM_EXECUCAO', 'CANCELADA'];
      case 'EM_EXECUCAO':
        return ['PAUSADA', 'ENCERRADO', 'CANCELADA'];
      case 'PAUSADA':
        return ['EM_EXECUCAO', 'ENCERRADO', 'CANCELADA'];
      default:
        return [];
    }
  }

  canChangeStatus(sprint: Sprint): boolean {
    return this.getAvailableStatusTransitions(sprint).length > 0;
  }

  onQuickStatusChange(sprint: Sprint, status: string): void {
    if (!sprint?.id || !status || status === sprint.status) {
      return;
    }

    if (!this.getAvailableStatusTransitions(sprint).includes(status)) {
      this.message.warning('Este estado da campanha ja esta fechado e nao permite alteracao.');
      return;
    }

    this.sprintService.updateSprintStatus(sprint.id, status).subscribe({
      next: updated => {
        this.dataSource = this.dataSource.map(item => item.id === updated.id ? updated : item);
        this.calculateStats();
        this.applyFilters();
        this.message.success(`Estado atualizado para ${this.getStatusLabel(status)}.`);
      },
      error: () => this.message.error('Erro ao atualizar estado da campanha.')
    });
  }

  search(): void {
    this.applyFilters();
  }

  reset(): void {
    this.searchValue = '';
    this.applyFilters();
  }

  openSprintDrawer(): void {
    this.isEditMode = false;
    this.isCopyMode = false;

    this.selectedSprintId = null;
    this.selectedSprint = null;

    this.sprintForm.reset({
      description: '',
      status: 'EM_EXECUCAO',
      campaignChannel: 'FACEBOOK',
      volumesPromoted: [],
      marketingBudget: 0,
      targetCarloads: 0,
      targetRevenue: 0
    });
    this.isSprintDrawerVisible = true;
    this.syncDescriptionEditor();
  }

  closeSprintDrawer(): void {
    if (this.isSaving) return;

    this.isSprintDrawerVisible = false;
    this.sprintForm.reset();
    this.selectedSprintId = null;
    this.selectedSprint = null;
    this.isEditMode = false;
    this.isCopyMode = false;
  }

  editSprint(sprint: Sprint): void {
    this.isEditMode = true;
    this.isCopyMode = false;

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
    this.syncDescriptionEditor();
  }

  copySprint(sprint: Sprint): void {
    this.isEditMode = false;
    this.isCopyMode = true;

    this.selectedSprintId = null;
    this.selectedSprint = null;
    this.isSprintDrawerVisible = true;

    this.sprintForm.patchValue({
      name: `${sprint.name || 'Campanha'} (copia)`,
      description: sprint.description,
      status: 'PLANEADA',
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
    this.syncDescriptionEditor();
  }

  saveSprint(): void {
    this.updateDescriptionFromEditor();

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
    const isUpdate = this.isEditMode && this.selectedSprintId;
    const wasCopy = this.isCopyMode;
    const request$ = isUpdate
      ? this.sprintService.updateSprint(this.selectedSprintId, formData)
      : this.sprintService.addSprint(formData);

    request$.subscribe({
      next: () => {
        this.isSaving = false;

        this.getSprints();
        this.closeSprintDrawer();

        if (isUpdate) {
          this.message.success('Sprint atualizada com sucesso.');
        } else if (wasCopy) {
          this.message.success('Copia da sprint criada com sucesso.');
        } else {
          this.message.success('Sprint criada com sucesso.');
        }
      },
      error: () => {
        this.isSaving = false;
        this.message.error('Erro ao gravar sprint.');
      }
    });
  }

  applyDescriptionFormat(command: 'bold' | 'italic' | 'insertUnorderedList' | 'insertOrderedList'): void {
    this.focusDescriptionEditor();
    document.execCommand(command, false);
    this.updateDescriptionFromEditor();
  }

  clearDescriptionFormat(): void {
    this.focusDescriptionEditor();
    document.execCommand('removeFormat', false);
    this.updateDescriptionFromEditor();
  }

  onDescriptionInput(): void {
    this.updateDescriptionFromEditor();
  }

  descriptionLength(): number {
    return this.descriptionEditor?.nativeElement.innerText.trim().length || 0;
  }

  deleteSprint(data: Sprint): void {
    this.confirmationDialog.confirmDelete({
      entity: this.t('common.entities.sprint'),
      name: data.name,
      onOk: () =>
        this.sprintService.deleteSprint(data.id).subscribe({
          next: () => {
            this.getSprints();
            this.message.success(this.t('sprints.messages.deleted'));
          },
          error: () => this.message.error(this.t('sprints.messages.deleteError'))
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

  private syncDescriptionEditor(): void {
    setTimeout(() => {
      if (!this.descriptionEditor) {
        return;
      }

      this.descriptionEditor.nativeElement.innerHTML = this.sprintForm.get('description')?.value || '';
    });
  }

  private updateDescriptionFromEditor(): void {
    if (!this.descriptionEditor) {
      return;
    }

    const value = this.sanitizeDescriptionHtml(this.descriptionEditor.nativeElement.innerHTML);
    this.sprintForm.get('description')?.setValue(value, {emitEvent: false});
    this.sprintForm.get('description')?.markAsDirty();
  }

  private focusDescriptionEditor(): void {
    this.descriptionEditor?.nativeElement.focus();
  }

  private sanitizeDescriptionHtml(value: string): string {
    return (value || '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      .trim();
  }

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }

  private getCurrentUserRole(): string {
    try {
      const rawUser = localStorage.getItem('user');
      return rawUser ? (JSON.parse(rawUser)?.role || '').toString().toUpperCase() : '';
    } catch {
      return '';
    }
  }
}
