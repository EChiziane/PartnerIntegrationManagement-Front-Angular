// dashboard.component.ts
import {Component, OnInit} from '@angular/core';
import {NzMessageService} from 'ng-zorro-antd/message';
import {CarLoad} from '../../models/CSM/carlaod';
import {CarloadService} from '../../services/carload.service';


type CarLoadStatus = 'SCHEDULED' | 'PENDING' | 'DELIVERED' | 'CANCELLED' | 'ENTREGUE' | string;
type FilterMode = 'NONE' | 'TODAY' | 'RANGE';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  dataSource: CarLoad[] = [];
  isLoading = false;

  searchValue = '';
  filterMode: FilterMode = 'NONE';
  rangeStart: Date | null = null;
  rangeEnd: Date | null = null;

  inProgressList: CarLoad[] = [];
  scheduledList: CarLoad[] = [];
  doneList: CarLoad[] = [];

  inProgressCount = 0;
  scheduledCount = 0;
  doneCount = 0;

  constructor(
    private carloadService: CarloadService,
    private message: NzMessageService
  ) {
  }

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.load();
  }

  filterToday(): void {
    this.filterMode = 'TODAY';
    this.rangeStart = null;
    this.rangeEnd = null;
    this.applyFilters();
  }

  toggleRange(): void {
    if (this.filterMode === 'RANGE') {
      this.filterMode = 'NONE';
      this.rangeStart = null;
      this.rangeEnd = null;
    } else {
      this.filterMode = 'RANGE';
    }
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchValue = '';
    this.filterMode = 'NONE';
    this.rangeStart = null;
    this.rangeEnd = null;
    this.applyFilters();
  }

  getStatusLabel(status: CarLoadStatus): string {
    switch ((status || '').toUpperCase()) {
      case 'SCHEDULED':
        return 'Agendada';
      case 'PENDING':
        return 'Em execução';
      case 'DELIVERED':
      case 'ENTREGUE':
        return 'Feita';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status as string;
    }
  }

  statusColor(status: CarLoadStatus): string {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED' || s === 'ENTREGUE') return 'green';
    if (s === 'SCHEDULED') return 'orange';
    if (s === 'PENDING') return 'blue';
    if (s === 'CANCELLED') return 'red';
    return 'default';
  }

  applyFilters(): void {
    let data = [...this.dataSource];

    // search
    if (this.searchValue?.trim()) {
      const v = this.searchValue.toLowerCase();
      data = data.filter(item =>
        (item.customerName || '').toLowerCase().includes(v) ||
        (item.customerPhoneNumber || '').toLowerCase().includes(v) ||
        (item.deliveryDestination || '').toLowerCase().includes(v) ||
        (item.transportedMaterial || '').toLowerCase().includes(v)
      );
    }

    // ✅ filtros por data: Feitas usam deliveredDate; outras usam deliveryScheduledDate
    const getDateForFilter = (c: CarLoad): string | null | undefined =>
      this.isDone(c.deliveryStatus) ? c.deliveredDate : c.deliveryScheduledDate;

    if (this.filterMode === 'TODAY') {
      const today = new Date();
      data = data.filter(c => this.isSameDay(this.parseDate(getDateForFilter(c)), today));
    }

    if (this.filterMode === 'RANGE') {
      if (this.rangeStart || this.rangeEnd) {
        const start = this.rangeStart ? this.startOfDay(this.rangeStart) : null;
        const end = this.rangeEnd ? this.endOfDay(this.rangeEnd) : null;

        data = data.filter(c => {
          const d = this.parseDate(getDateForFilter(c));
          if (start && d < start) return false;
          if (end && d > end) return false;
          return true;
        });
      }
    }

    // lists + sort
    this.inProgressList = data
      .filter(c => this.isInProgress(c.deliveryStatus))
      .sort((a, b) => this.parseDate(a.deliveryScheduledDate).getTime() - this.parseDate(b.deliveryScheduledDate).getTime());

    this.scheduledList = data
      .filter(c => this.isScheduled(c.deliveryStatus))
      .sort((a, b) => this.parseDate(a.deliveryScheduledDate).getTime() - this.parseDate(b.deliveryScheduledDate).getTime());

    // ✅ Feitas ordenam por deliveredDate
    this.doneList = data
      .filter(c => this.isDone(c.deliveryStatus))
      .sort((a, b) => this.parseDate(b.deliveredDate).getTime() - this.parseDate(a.deliveredDate).getTime());

    this.inProgressCount = this.inProgressList.length;
    this.scheduledCount = this.scheduledList.length;
    this.doneCount = this.doneList.length;
  }

  openInCarradas(_: CarLoad): void {
    window.location.href = '/app/carload';
  }

  trackById(_: number, item: CarLoad): string {
    return item.id;
  }

  // ✅ mantém o format original (yyyy-MM-dd HH:mm)
  formatDateTime(v: string | null | undefined): string {
    const d = this.parseDate(v);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }

  // ✅ novo helper: quando não tem deliveredDate
  formatDateTimeOrDash(v: string | null | undefined): string {
    if (!v) return '—';
    return this.formatDateTime(v);
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
        this.message.error('Erro ao carregar dashboard. 🚫');
        this.isLoading = false;
      }
    });
  }

  private isDone(status: CarLoadStatus): boolean {
    const s = (status || '').toUpperCase();
    return s === 'DELIVERED' || s === 'ENTREGUE';
  }

  private isScheduled(status: CarLoadStatus): boolean {
    return (status || '').toUpperCase() === 'SCHEDULED';
  }

  private isInProgress(status: CarLoadStatus): boolean {
    return (status || '').toUpperCase() === 'PENDING';
  }

  private parseDate(v: string | null | undefined): Date {
    if (!v) return new Date(0);

    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;

    const safe = v.replace(' ', 'T');
    const d2 = new Date(safe);
    return isNaN(d2.getTime()) ? new Date(0) : d2;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }
}
