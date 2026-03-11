import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {NzMessageService} from 'ng-zorro-antd/message';
import {CarLoad, CarLoadStatus} from '../../models/CSM/carlaod';
import {CarloadService} from '../../services/carload.service';

type FilterMode = 'ALL' | 'TODAY' | 'RANGE';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  dataSource: CarLoad[] = [];
  isLoading = false;
  changingStatusId: string | null = null;

  searchValue = '';
  filterMode: FilterMode = 'ALL';
  rangeStart: Date | null = null;
  rangeEnd: Date | null = null;

  inProgressList: CarLoad[] = [];
  scheduledList: CarLoad[] = [];
  doneList: CarLoad[] = [];

  inProgressCount = 0;
  scheduledCount = 0;
  doneCount = 0;

  showDoneCard = false;

  constructor(
    private carloadService: CarloadService,
    private message: NzMessageService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.load();
  }

  toggleDoneCard(): void {
    this.showDoneCard = !this.showDoneCard;
  }

  filterAll(): void {
    this.filterMode = 'ALL';
    this.rangeStart = null;
    this.rangeEnd = null;
    this.applyFilters();
  }

  filterToday(): void {
    this.filterMode = 'TODAY';
    this.rangeStart = null;
    this.rangeEnd = null;
    this.applyFilters();
  }

  toggleRange(): void {
    if (this.filterMode === 'RANGE') {
      this.filterMode = 'ALL';
      this.rangeStart = null;
      this.rangeEnd = null;
    } else {
      this.filterMode = 'RANGE';
    }
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchValue = '';
    this.filterMode = 'ALL';
    this.rangeStart = null;
    this.rangeEnd = null;
    this.applyFilters();
  }

  getStatusLabel(status: CarLoadStatus): string {
    switch ((status || '').toUpperCase()) {
      case 'SCHEDULED':
        return 'Agendada';
      case 'IN_PROGRESS':
        return 'Em execução';
      case 'DELIVERED':
        return 'Entregue';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status as string;
    }
  }

  statusColor(status: CarLoadStatus): string {
    const normalizedStatus = (status || '').toUpperCase();

    if (normalizedStatus === 'DELIVERED') return 'green';
    if (normalizedStatus === 'SCHEDULED') return 'orange';
    if (normalizedStatus === 'IN_PROGRESS') return 'blue';
    if (normalizedStatus === 'CANCELLED') return 'red';

    return 'default';
  }

  getScheduledBadgeLabel(value: string | null | undefined): string {
    const date = this.parseDate(value);
    if (date.getTime() === 0) return 'Sem data';

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const formattedDate = `${dd}/${mm}/${yyyy}`;

    if (this.isSameDay(date, today)) {
      return `Hoje · ${formattedDate}`;
    }

    if (this.isSameDay(date, tomorrow)) {
      return `Amanhã · ${formattedDate}`;
    }

    if (date.getTime() < this.startOfDay(today).getTime()) {
      return `Atrasada · ${formattedDate}`;
    }

    return formattedDate;
  }

  getScheduledBadgeClass(value: string | null | undefined): string {
    const date = this.parseDate(value);
    if (date.getTime() === 0) return 'date-neutral';

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (this.isSameDay(date, today)) return 'date-today';
    if (this.isSameDay(date, tomorrow)) return 'date-tomorrow';
    if (date.getTime() < this.startOfDay(today).getTime()) return 'date-overdue';

    return 'date-upcoming';
  }

  applyFilters(): void {
    let filteredData = [...this.dataSource];

    if (this.searchValue?.trim()) {
      const search = this.searchValue.toLowerCase();
      filteredData = filteredData.filter(item =>
        (item.customerName || '').toLowerCase().includes(search) ||
        (item.customerPhoneNumber || '').toLowerCase().includes(search) ||
        (item.deliveryDestination || '').toLowerCase().includes(search) ||
        (item.transportedMaterial || '').toLowerCase().includes(search) ||
        (item.assignedDriverName || '').toLowerCase().includes(search) ||
        (item.logisticsManagerName || '').toLowerCase().includes(search)
      );
    }

    const getRelevantDate = (carload: CarLoad): string | null =>
      this.isDone(carload.deliveryStatus) ? carload.deliveryDate : carload.deliveryScheduledDate;

    if (this.filterMode === 'TODAY') {
      const today = new Date();
      filteredData = filteredData.filter(carload =>
        this.isSameDay(this.parseDate(getRelevantDate(carload)), today)
      );
    }

    if (this.filterMode === 'RANGE' && (this.rangeStart || this.rangeEnd)) {
      const start = this.rangeStart ? this.startOfDay(this.rangeStart) : null;
      const end = this.rangeEnd ? this.endOfDay(this.rangeEnd) : null;

      filteredData = filteredData.filter(carload => {
        const date = this.parseDate(getRelevantDate(carload));
        if (start && date < start) return false;
        if (end && date > end) return false;
        return true;
      });
    }

    this.inProgressList = filteredData
      .filter(carload => this.isInProgress(carload.deliveryStatus))
      .sort((a, b) =>
        this.parseDate(a.deliveryScheduledDate).getTime() -
        this.parseDate(b.deliveryScheduledDate).getTime()
      );

    this.scheduledList = filteredData
      .filter(carload => this.isScheduled(carload.deliveryStatus))
      .sort((a, b) =>
        this.parseDate(a.deliveryScheduledDate).getTime() -
        this.parseDate(b.deliveryScheduledDate).getTime()
      );

    this.doneList = filteredData
      .filter(carload => this.isDone(carload.deliveryStatus))
      .sort((a, b) =>
        this.parseDate(b.deliveryDate).getTime() -
        this.parseDate(a.deliveryDate).getTime()
      );

    this.inProgressCount = this.inProgressList.length;
    this.scheduledCount = this.scheduledList.length;
    this.doneCount = this.doneList.length;
  }

  goToCarloadDetails(carload: CarLoad): void {
    this.router.navigate(['/app/carload-details', carload.id]);
  }

  trackById(_: number, item: CarLoad): string {
    return item.id;
  }

  formatDateTime(value: string | null | undefined): string {
    const date = this.parseDate(value);

    if (date.getTime() === 0) {
      return '—';
    }

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }

  formatDateTimeOrDash(value: string | null | undefined): string {
    if (!value) return '—';
    return this.formatDateTime(value);
  }

  startExecution(carload: CarLoad): void {
    this.changeStatus(carload, 'IN_PROGRESS');
  }

  markAsDelivered(carload: CarLoad): void {
    this.changeStatus(carload, 'DELIVERED');
  }

  cancelCarload(carload: CarLoad): void {
    this.changeStatus(carload, 'CANCELLED');
  }

  private changeStatus(carload: CarLoad, newStatus: CarLoadStatus): void {
    this.changingStatusId = carload.id;

    const payload = {
      deliveryDestination: carload.deliveryDestination,
      customerName: carload.customerName,
      logisticsManagerId: carload.logisticsManagerId,
      assignedDriverId: carload.assignedDriverId,
      transportedMaterial: carload.transportedMaterial,
      carloadBatchId: carload.carloadBatchId,
      customerPhoneNumber: carload.customerPhoneNumber,
      totalSpent: carload.totalSpent,
      totalEarnings: carload.totalEarnings,
      deliveryDate:
        newStatus === 'DELIVERED'
          ? new Date().toISOString().slice(0, 19)
          : newStatus === 'CANCELLED'
            ? null
            : carload.deliveryDate,
      deliveryScheduledDate: carload.deliveryScheduledDate,
      deliveryStatus: newStatus,
      carloadType: carload.carloadType
    };

    this.carloadService.updateCarLoad(carload.id, payload).subscribe({
      next: () => {
        const messageMap: Record<CarLoadStatus, string> = {
          SCHEDULED: 'Carrada actualizada para Agendada.',
          IN_PROGRESS: 'Carrada marcada como Em execução.',
          DELIVERED: 'Carrada marcada como Entregue.',
          CANCELLED: 'Carrada cancelada com sucesso.'
        };

        this.message.success(messageMap[newStatus]);
        this.changingStatusId = null;
        this.load();
      },
      error: () => {
        this.message.error('Erro ao actualizar o estado da carrada.');
        this.changingStatusId = null;
      }
    });
  }

  private load(): void {
    this.isLoading = true;

    this.carloadService.getCarLoads().subscribe({
      next: (data) => {
        this.dataSource = data || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.message.error('Erro ao carregar dashboard.');
        this.isLoading = false;
      }
    });
  }

  private isDone(status: CarLoadStatus): boolean {
    return (status || '').toUpperCase() === 'DELIVERED';
  }

  private isScheduled(status: CarLoadStatus): boolean {
    return (status || '').toUpperCase() === 'SCHEDULED';
  }

  private isInProgress(status: CarLoadStatus): boolean {
    return (status || '').toUpperCase() === 'IN_PROGRESS';
  }

  private parseDate(value: string | null | undefined): Date {
    if (!value) {
      return new Date(0);
    }

    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }

    const safeValue = value.replace(' ', 'T');
    const fallbackDate = new Date(safeValue);

    return isNaN(fallbackDate.getTime()) ? new Date(0) : fallbackDate;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  private startOfDay(date: Date): Date {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private endOfDay(date: Date): Date {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
  }
}
