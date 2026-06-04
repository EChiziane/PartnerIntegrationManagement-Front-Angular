import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {NzMessageService} from 'ng-zorro-antd/message';
import {CarloadCustomer} from '@shared/models/carload-customer';
import {CarLoad} from '@shared/models/carload';
import {CarloadCustomerService} from '@core/services/carload-customer.service';
import {CarloadService} from '@core/services/carload.service';
import {CarloadCustomerDetailPdfService} from '@core/services/carload-customer-detail-pdf.service';

@Component({
  selector: 'app-carload-customer-detail',
  standalone: false,
  templateUrl: './carload-customer-detail.component.html',
  styleUrls: ['./carload-customer-detail.component.scss']
})
export class CarloadCustomerDetailComponent implements OnInit {
  customer: CarloadCustomer | null = null;
  carloads: CarLoad[] = [];
  isLoading = false;

  totalCarloads = 0;
  scheduledCount = 0;
  inProgressCount = 0;
  deliveredCount = 0;
  cancelledCount = 0;
  totalEarnings = 0;
  totalSpent = 0;
  estimatedMargin = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CarloadCustomerService,
    private carloadService: CarloadService,
    private customerPdfService: CarloadCustomerDetailPdfService,
    private message: NzMessageService
  ) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');

      if (!id) {
        this.message.error('Cliente nao informado.');
        this.goBack();
        return;
      }

      this.loadCustomer(id);
    });
  }

  get initials(): string {
    const value = this.customer?.name || 'C';
    return value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'C';
  }

  get fullAddress(): string {
    const parts = [
      this.customer?.streetAddress,
      this.customer?.city,
      this.customer?.zipCode
    ].filter(Boolean);

    return parts.length ? parts.join(', ') : 'Sem morada registada';
  }

  formatMoney(value: number | null | undefined): string {
    return `${Number(value || 0).toFixed(2)} Mts`;
  }

  phoneHref(phone: string | null | undefined): string {
    const digits = (phone || '').toString().replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : 'tel:';
  }

  statusLabel(status: string | null | undefined): string {
    switch ((status || '').toUpperCase()) {
      case 'SCHEDULED':
        return 'Agendada';
      case 'IN_PROGRESS':
        return 'Em execucao';
      case 'DELIVERED':
        return 'Entregue';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status || '-';
    }
  }

  statusColor(status: string | null | undefined): string {
    const value = (status || '').toUpperCase();
    if (value === 'SCHEDULED') return 'orange';
    if (value === 'IN_PROGRESS') return 'blue';
    if (value === 'DELIVERED') return 'green';
    if (value === 'CANCELLED') return 'red';
    return 'default';
  }

  goBack(): void {
    window.history.back();
  }

  goToCustomers(): void {
    this.router.navigate(['/app/carload-customer']);
  }

  goToCarload(carload: CarLoad): void {
    this.router.navigate(['/app/carload-details', carload.id]);
  }

  downloadCustomerPdf(): void {
    if (!this.customer) {
      this.message.warning('Nenhum cliente disponivel para exportar.');
      return;
    }

    this.customerPdfService.downloadCustomerReport(this.customer, this.carloads);
    this.message.success('PDF do cliente gerado com sucesso!');
  }

  private loadCustomer(id: string): void {
    this.isLoading = true;

    this.customerService.getCustomerById(id).subscribe({
      next: customer => {
        this.customer = customer;
        this.loadCarloads();
      },
      error: () => {
        this.isLoading = false;
        this.message.error('Erro ao carregar cliente.');
      }
    });
  }

  private loadCarloads(): void {
    this.carloadService.getCarLoads().subscribe({
      next: carloads => {
        this.carloads = (carloads || [])
          .filter(carload => this.belongsToCustomer(carload))
          .sort((a, b) => this.dateValue(b.createdAt) - this.dateValue(a.createdAt));

        this.refreshStats();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.message.error('Erro ao carregar carradas do cliente.');
      }
    });
  }

  private belongsToCustomer(carload: CarLoad): boolean {
    if (!this.customer) return false;

    return carload.customerId === this.customer.id ||
      this.same(carload.customerPhoneNumber, this.customer.phoneNumber) ||
      this.same(carload.customerName, this.customer.name);
  }

  private same(left: string | null | undefined, right: string | null | undefined): boolean {
    return (left || '').trim().toLowerCase() === (right || '').trim().toLowerCase();
  }

  private refreshStats(): void {
    this.totalCarloads = this.carloads.length;
    this.scheduledCount = this.carloads.filter(item => item.deliveryStatus === 'SCHEDULED').length;
    this.inProgressCount = this.carloads.filter(item => item.deliveryStatus === 'IN_PROGRESS').length;
    this.deliveredCount = this.carloads.filter(item => item.deliveryStatus === 'DELIVERED').length;
    this.cancelledCount = this.carloads.filter(item => item.deliveryStatus === 'CANCELLED').length;
    this.totalEarnings = this.carloads.reduce((sum, item) => sum + Number(item.totalEarnings || 0), 0);
    this.totalSpent = this.carloads.reduce((sum, item) => sum + Number(item.totalSpent || 0), 0);
    this.estimatedMargin = this.totalEarnings - this.totalSpent;
  }

  private dateValue(value: string | null | undefined): number {
    const date = value ? new Date(value) : new Date(0);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }
}
