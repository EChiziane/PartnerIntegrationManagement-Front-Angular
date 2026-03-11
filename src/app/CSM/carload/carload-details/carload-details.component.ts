import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CarloadService } from '../../../services/carload.service';
import { DriverService } from '../../../services/driver.service';
import { ManagerService } from '../../../services/manager.service';
import { SprintService } from '../../../services/sprint.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Manager } from '../../../models/CSM/manager';
import { Driver } from '../../../models/CSM/driver';
import { CarLoad } from '../../../models/CSM/carlaod';
import { Sprint } from '../../../models/CSM/sprint';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-carload-details',
  standalone: false,
  templateUrl: './carload-details.component.html',
  styleUrls: ['./carload-details.component.scss']
})
export class CarloadDetailsComponent {
  @ViewChild('pdfContent') pdfContent!: ElementRef<HTMLDivElement>;

  isLoading = false;
  isDownloadingPdf = false;

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
    private sprintService: SprintService
  ) {}

  get statusLabel(): string {
    const status = (this.carload?.deliveryStatus || '').toUpperCase();
    if (status === 'SCHEDULED') return 'Agendada';
    if (status === 'IN_PROGRESS') return 'Em execução';
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
      this.message.error('ID da carrada não encontrado.');
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
    if (!this.carload || !this.pdfContent) {
      this.message.warning('Nenhum conteúdo disponível para exportar.');
      return;
    }

    this.isDownloadingPdf = true;

    try {
      const element = this.pdfContent.nativeElement;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imageData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;

      const usableWidth = pdfWidth - margin * 2;
      const imageHeight = (canvas.height * usableWidth) / canvas.width;

      let heightLeft = imageHeight;
      let position = margin;

      pdf.addImage(imageData, 'PNG', margin, position, usableWidth, imageHeight);
      heightLeft -= (pdfHeight - margin * 2);

      while (heightLeft > 0) {
        position = -(imageHeight - heightLeft) + margin;
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', margin, position, usableWidth, imageHeight);
        heightLeft -= (pdfHeight - margin * 2);
      }

      const customer = (this.carload.customerName || 'carload').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
      const fileName = `carload_${customer}_${this.carload.id}.pdf`;

      pdf.save(fileName);
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
          this.message.error('Carrada não encontrada.');
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
