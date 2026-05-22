import {Component} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {NzMessageService} from 'ng-zorro-antd/message';

import {CarloadService} from '@core/services/carload.service';
import {DriverService} from '@core/services/driver.service';
import {ManagerService} from '@core/services/manager.service';
import {SprintService} from '@core/services/sprint.service';
import {CarloadDetailPdfService} from '@core/services/carload-detail-pdf.service';
import {Manager} from '@shared/models/manager';
import {Driver} from '@shared/models/driver';
import {CarLoad} from '@shared/models/carload';
import {Sprint} from '@shared/models/sprint';
import {COMPANY_PROFILE} from '@shared/data/company-profile';

@Component({
  selector: 'app-carload-details',
  standalone: false,
  templateUrl: './carload-details.component.html',
  styleUrls: ['./carload-details.component.scss']
})
export class CarloadDetailsComponent {
  isLoading = false;
  isDownloadingPdf = false;
  company = COMPANY_PROFILE;

  carload: CarLoad | null = null;

  driver: Driver | null = null;
  manager: Manager | null = null;
  sprint: Sprint | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private message: NzMessageService,
    private carloadService: CarloadService,
    private driverService: DriverService,
    private managerService: ManagerService,
    private sprintService: SprintService,
    private carloadPdfService: CarloadDetailPdfService
  ) {
  }

  get statusLabel(): string {
    const status = (this.carload?.deliveryStatus || '').toUpperCase();
    if (status === 'SCHEDULED') return 'Agendada';
    if (status === 'IN_PROGRESS') return 'Em execucao';
    if (status === 'DELIVERED') return 'Entregue';
    if (status === 'CANCELLED') return 'Cancelada';
    return this.carload?.deliveryStatus || '';
  }

  get statusColor(): string {
    const status = (this.carload?.deliveryStatus || '').toUpperCase();
    if (status === 'DELIVERED') return 'green';
    if (status === 'CANCELLED') return 'red';
    if (status === 'SCHEDULED') return 'blue';
    if (status === 'IN_PROGRESS') return 'orange';
    return 'default';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.message.error('ID da carrada nao encontrado.');
      this.router.navigate(['/app/carload']);
      return;
    }

    this.loadCarloadDetails(id);
  }

  onBack(): void {
    window.history.back();
  }

  money(value: number | null | undefined): string {
    const amount = Number(value || 0);
    return `${amount.toFixed(2)} Mts`;
  }

  async downloadPdf(): Promise<void> {
    if (!this.carload) {
      this.message.warning('Nenhum conteudo disponivel para exportar.');
      return;
    }

    this.isDownloadingPdf = true;

    try {
      this.carloadPdfService.downloadCarloadReport(this.carload, this.driver, this.manager, this.sprint);
      this.message.success('PDF gerado com sucesso!');
    } catch (error) {
      this.message.error('Erro ao gerar o PDF.');
    } finally {
      this.isDownloadingPdf = false;
    }
  }

  private loadCarloadDetails(id: string): void {
    this.isLoading = true;

    this.carloadService.getCarLoads().subscribe({
      next: (data) => {
        const found = (data || []).find(item => item.id === id);

        if (!found) {
          this.message.error('Carrada nao encontrada.');
          this.isLoading = false;
          this.router.navigate(['/app/carload']);
          return;
        }

        this.carload = found;
        this.loadRelated(found);
        this.isLoading = false;
      },
      error: () => {
        this.message.error('Erro ao carregar detalhes da carrada.');
        this.isLoading = false;
      }
    });
  }

  private loadRelated(carload: CarLoad): void {
    if (carload.assignedDriverId) {
      this.driverService.getDrivers().subscribe({
        next: (drivers) => {
          this.driver = (drivers || []).find(driver => driver.id === carload.assignedDriverId) || null;
        }
      });
    }

    if (carload.logisticsManagerId) {
      this.managerService.getManagers().subscribe({
        next: (managers) => {
          this.manager = (managers || []).find(manager => manager.id === carload.logisticsManagerId) || null;
        }
      });
    }

    if (carload.carloadBatchId) {
      this.sprintService.getSprints().subscribe({
        next: (sprints) => {
          this.sprint = (sprints || []).find(sprint => sprint.id === carload.carloadBatchId) || null;
        }
      });
    }
  }
}
