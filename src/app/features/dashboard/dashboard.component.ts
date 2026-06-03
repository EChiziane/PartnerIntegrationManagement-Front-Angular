import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzModalService} from 'ng-zorro-antd/modal';
import {CarLoad, CarLoadStatus} from '@shared/models/carload';
import {CarloadService} from '@core/services/carload.service';
import {TranslationService} from '@core/services/translation.service';

type FilterMode = 'ALL' | 'TODAY' | 'RANGE';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  dataSource: CarLoad[] = [];
  filteredData: CarLoad[] = [];
  isLoading = false;
  changingStatusId: string | null = null;

  searchValue = '';
  filterMode: FilterMode = 'ALL';
  rangeStart: Date | null = null;
  rangeEnd: Date | null = null;

  priorityList: CarLoad[] = [];
  inProgressList: CarLoad[] = [];
  scheduledList: CarLoad[] = [];
  cancelledList: CarLoad[] = [];
  doneList: CarLoad[] = [];

  totalCount = 0;
  activeCount = 0;
  todayCount = 0;
  overdueCount = 0;
  inProgressCount = 0;
  scheduledCount = 0;
  cancelledCount = 0;
  doneCount = 0;
  totalEarnings = 0;
  totalSpent = 0;
  estimatedMargin = 0;

  showDoneCard = false;
  showCancelledCard = true;

  constructor(
    private carloadService: CarloadService,
    private message: NzMessageService,
    private modal: NzModalService,
    private router: Router,
    private translationService: TranslationService
  ) {
  }

  ngOnInit(): void {
    this.load();
  }

  get operationHeadline(): string {
    if (this.overdueCount > 0) {
      return this.t('dashboard.hero.scheduledAttention', {count: this.overdueCount});
    }

    if (this.inProgressCount > 0) {
      return this.t('dashboard.hero.inProgressNow', {count: this.inProgressCount});
    }

    if (this.todayCount > 0) {
      return this.t('dashboard.hero.todayMarked', {count: this.todayCount});
    }

    if (this.scheduledCount > 0) {
      return this.t('dashboard.hero.ready');
    }

    return this.t('dashboard.hero.empty');
  }

  get operationSubline(): string {
    const next = this.nextScheduled();

    if (next) {
      return this.t('dashboard.hero.next', {
        customer: next.customerName,
        destination: next.deliveryDestination,
        date: this.getScheduledBadgeLabel(next.deliveryScheduledDate)
      });
    }

    return this.t('dashboard.hero.start');
  }

  get marginTone(): string {
    if (this.estimatedMargin > 0) return 'positive';
    if (this.estimatedMargin < 0) return 'negative';
    return 'neutral';
  }

  reload(): void {
    this.load();
  }

  toggleDoneCard(): void {
    this.showDoneCard = !this.showDoneCard;
  }

  toggleCancelledCard(): void {
    this.showCancelledCard = !this.showCancelledCard;
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

  goToCarloads(): void {
    this.router.navigate(['/app/carload']);
  }

  getStatusLabel(status: CarLoadStatus): string {
    switch ((status || '').toUpperCase()) {
      case 'SCHEDULED':
        return this.t('dashboard.status.scheduled');
      case 'IN_PROGRESS':
        return this.t('dashboard.status.progress');
      case 'DELIVERED':
        return this.t('dashboard.status.delivered');
      case 'CANCELLED':
        return this.t('dashboard.status.cancelled');
      default:
        return status as string;
    }
  }

  getTypeLabel(carload: CarLoad): string {
    return carload.carloadType === 'Sold'
      ? this.t('dashboard.type.sold')
      : this.t('dashboard.type.produced');
  }

  statusColor(status: CarLoadStatus): string {
    const normalizedStatus = (status || '').toUpperCase();

    if (normalizedStatus === 'DELIVERED') return 'green';
    if (normalizedStatus === 'SCHEDULED') return 'orange';
    if (normalizedStatus === 'IN_PROGRESS') return 'blue';
    if (normalizedStatus === 'CANCELLED') return 'red';

    return 'default';
  }

  formatMoney(value: number | null | undefined): string {
    return `${Number(value || 0).toFixed(2)} Mts`;
  }

  carloadProfit(carload: CarLoad): number {
    return Number(carload.totalEarnings || 0) - Number(carload.totalSpent || 0);
  }

  getScheduledBadgeLabel(value: string | null | undefined): string {
    const date = this.parseDate(value);
    if (date.getTime() === 0) return this.t('dashboard.schedule.noDate');

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const formattedDate = `${dd}/${mm}/${yyyy} ${hh}:${mi}`;

    if (this.isSameDay(date, today)) {
      return this.t('dashboard.schedule.today', {date: formattedDate});
    }

    if (this.isSameDay(date, tomorrow)) {
      return this.t('dashboard.schedule.tomorrow', {date: formattedDate});
    }

    if (date.getTime() < this.startOfDay(today).getTime()) {
      return this.t('dashboard.schedule.overdue', {date: formattedDate});
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

  priorityReason(carload: CarLoad): string {
    if (this.isInProgress(carload.deliveryStatus)) {
      return this.t('dashboard.priority.progress');
    }

    if (this.isOverdue(carload)) {
      return this.t('dashboard.priority.overdue');
    }

    if (this.isToday(carload)) {
      return this.t('dashboard.priority.today');
    }

    return this.t('dashboard.priority.next');
  }

  priorityClass(carload: CarLoad): string {
    if (this.isOverdue(carload)) return 'priority-danger';
    if (this.isInProgress(carload.deliveryStatus)) return 'priority-live';
    if (this.isToday(carload)) return 'priority-today';
    return 'priority-next';
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
        (item.logisticsManagerName || '').toLowerCase().includes(search) ||
        (item.carloadBatchName || '').toLowerCase().includes(search) ||
        (item.createdByName || '').toLowerCase().includes(search)
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

    this.filteredData = filteredData;

    this.inProgressList = filteredData
      .filter(carload => this.isInProgress(carload.deliveryStatus))
      .sort((a, b) => this.parseDate(a.deliveryScheduledDate).getTime() - this.parseDate(b.deliveryScheduledDate).getTime());

    this.scheduledList = filteredData
      .filter(carload => this.isScheduled(carload.deliveryStatus))
      .sort((a, b) => this.parseDate(a.deliveryScheduledDate).getTime() - this.parseDate(b.deliveryScheduledDate).getTime());

    this.cancelledList = filteredData
      .filter(carload => this.isCancelled(carload.deliveryStatus))
      .sort((a, b) => this.parseDate(b.deliveryScheduledDate).getTime() - this.parseDate(a.deliveryScheduledDate).getTime());

    this.doneList = filteredData
      .filter(carload => this.isDone(carload.deliveryStatus))
      .sort((a, b) => this.parseDate(b.deliveryDate).getTime() - this.parseDate(a.deliveryDate).getTime());

    this.priorityList = [
      ...this.inProgressList,
      ...this.scheduledList.filter(carload => this.isOverdue(carload)),
      ...this.scheduledList.filter(carload => this.isToday(carload)),
      ...this.scheduledList.filter(carload => !this.isOverdue(carload) && !this.isToday(carload)).slice(0, 3)
    ].filter((carload, index, list) => list.findIndex(item => item.id === carload.id) === index).slice(0, 8);

    this.totalCount = filteredData.length;
    this.inProgressCount = this.inProgressList.length;
    this.scheduledCount = this.scheduledList.length;
    this.cancelledCount = this.cancelledList.length;
    this.doneCount = this.doneList.length;
    this.activeCount = this.inProgressCount + this.scheduledCount;
    this.todayCount = filteredData.filter(carload => !this.isCancelled(carload.deliveryStatus) && this.isToday(carload)).length;
    this.overdueCount = this.scheduledList.filter(carload => this.isOverdue(carload)).length;
    this.totalEarnings = filteredData.reduce((total, carload) => total + Number(carload.totalEarnings || 0), 0);
    this.totalSpent = filteredData.reduce((total, carload) => total + Number(carload.totalSpent || 0), 0);
    this.estimatedMargin = this.totalEarnings - this.totalSpent;
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
      return '-';
    }

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }

  formatDateTimeOrDash(value: string | null | undefined): string {
    if (!value) return '-';
    return this.formatDateTime(value);
  }

  startExecution(carload: CarLoad): void {
    this.changeStatus(carload, 'IN_PROGRESS');
  }

  markAsDelivered(carload: CarLoad): void {
    this.changeStatus(carload, 'DELIVERED');
  }

  rescheduleCarload(carload: CarLoad): void {
    this.changeStatus(carload, 'SCHEDULED');
  }

  cancelCarload(carload: CarLoad): void {
    this.modal.confirm({
      nzCentered: true,
      nzClassName: 'tc-confirm-danger',
      nzTitle: this.t('dashboard.modal.cancelTitle'),
      nzContent: this.t('dashboard.modal.cancelContent', {
        customer: carload.customerName,
        destination: carload.deliveryDestination
      }),
      nzOkDanger: true,
      nzOkText: this.t('dashboard.modal.cancelOk'),
      nzCancelText: this.t('common.actions.keep'),
      nzOnOk: () => this.changeStatus(carload, 'CANCELLED')
    });
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
        const messageMap: Partial<Record<CarLoadStatus, string>> = {
          SCHEDULED: this.t('dashboard.messages.scheduled'),
          IN_PROGRESS: this.t('dashboard.messages.progress'),
          DELIVERED: this.t('dashboard.messages.delivered'),
          CANCELLED: this.t('dashboard.messages.cancelled')
        };

        this.message.success(messageMap[newStatus] || this.t('dashboard.messages.progress'));
        this.changingStatusId = null;
        this.load();
      },
      error: () => {
        this.message.error(this.t('dashboard.messages.statusError'));
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
        this.message.error(this.t('dashboard.messages.loadError'));
        this.isLoading = false;
      }
    });
  }

  private nextScheduled(): CarLoad | null {
    return this.scheduledList.find(carload => !this.isOverdue(carload)) || this.scheduledList[0] || null;
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

  private isCancelled(status: CarLoadStatus): boolean {
    return (status || '').toUpperCase() === 'CANCELLED';
  }

  private isToday(carload: CarLoad): boolean {
    const value = this.isDone(carload.deliveryStatus) ? carload.deliveryDate : carload.deliveryScheduledDate;
    return this.isSameDay(this.parseDate(value), new Date());
  }

  private isOverdue(carload: CarLoad): boolean {
    if (!this.isScheduled(carload.deliveryStatus)) return false;
    const date = this.parseDate(carload.deliveryScheduledDate);
    if (date.getTime() === 0) return false;
    return date.getTime() < this.startOfDay(new Date()).getTime();
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

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }
}
