import { Component } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {CarloadService} from '../services/carload.service';
import {DriverService} from '../services/driver.service';
import {ManagerService} from '../services/manager.service';
import {SprintService} from '../services/sprint.service';
import {NzMessageService} from 'ng-zorro-antd/message';
import {Manager} from '../models/CSM/manager';
import {Driver} from '../models/CSM/driver';
import {CarLoad} from '../models/CSM/carlaod';
import {Sprint} from '../models/CSM/sprint';

@Component({
  selector: 'app-carload-details',
  standalone: false,
  templateUrl: './carload-details.component.html',
  styleUrl: './carload-details.component.scss'
})
export class CarloadDetailsComponent {

  isLoading = false;

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
  ) {
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

  private loadCarloadDetails(id: string): void {
    this.isLoading = true;

    // 1) Busca tudo e filtra pelo id (sem precisar criar endpoint novo no backend agora)
    this.carloadService.getCarLoads().subscribe({
      next: (data) => {
        const found = (data || []).find(x => x.id === id);

        if (!found) {
          this.message.error('Carrada não encontrada.');
          this.isLoading = false;
          this.router.navigate(['/app/carload']);
          return;
        }

        this.carload = found;

        // 2) Busca entidades relacionadas em paralelo (se tiver endpoints por ID, substitui depois)
        this.loadRelated(found);

        this.isLoading = false;
      },
      error: () => {
        this.message.error('Erro ao carregar detalhes da carrada. 🚫');
        this.isLoading = false;
      }
    });
  }

  private loadRelated(c: CarLoad): void {
    // Motorista
    if (c.assignedDriverId) {
      this.driverService.getDrivers().subscribe({
        next: (drivers) => {
          this.driver = (drivers || []).find(d => d.id === c.assignedDriverId) || null;
        }
      });
    }

    // Gestor
    if (c.logisticsManagerId) {
      this.managerService.getManagers().subscribe({
        next: (managers) => {
          this.manager = (managers || []).find(m => m.id === c.logisticsManagerId) || null;
        }
      });
    }

    // Sprint
    if (c.carloadBatchId) {
      this.sprintService.getSprints().subscribe({
        next: (sprints) => {
          this.sprint = (sprints || []).find(s => s.id === c.carloadBatchId) || null;
        }
      });
    }
  }

  // ===== Helpers UI =====
  get statusLabel(): string {
    const s = (this.carload?.deliveryStatus || '').toUpperCase();
    if (s === 'SCHEDULED') return 'Agendada';
    if (s === 'PENDING') return 'Pendente';
    if (s === 'DELIVERED' || s === 'ENTREGUE') return 'Entregue';
    if (s === 'CANCELLED') return 'Cancelada';
    return this.carload?.deliveryStatus || '';
  }

  get statusColor(): string {
    const s = (this.carload?.deliveryStatus || '').toUpperCase();
    if (s === 'DELIVERED' || s === 'ENTREGUE') return 'green';
    if (s === 'CANCELLED') return 'red';
    if (s === 'SCHEDULED') return 'blue';
    return 'orange';
  }

  money(v: number | null | undefined): string {
    const n = Number(v || 0);
    return `${n.toFixed(2)} Mts`;
  }
}
