import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {ConnectionHealth, ConnectionStage, Partner, PartnerConnection, PartnerRequest} from '@shared/models/partner-integration';
import {PartnerIntegrationPdfService} from '@core/services/partner-integration-pdf.service';

@Component({
  selector: 'app-connections',
  standalone: false,
  templateUrl: './connections.component.html',
  styleUrls: ['./connections.component.scss']
})
export class ConnectionsComponent implements OnInit {
  partners: Partner[] = [];
  connections: PartnerConnection[] = [];
  requests: PartnerRequest[] = [];
  searchValue = '';
  selectedHealth: ConnectionHealth | 'ALL' = 'ALL';
  selectedStage: ConnectionStage | 'ALL' = 'ALL';
  selectedEnvironment = 'ALL';
  selectedService = 'ALL';
  pageIndex = 1;
  pageSize = 12;
  readonly healthOptions: ConnectionHealth[] = ['HEALTHY', 'DEGRADED', 'DOWN', 'NOT_ESTABLISHED', 'BLOCKED', 'DISABLED'];
  readonly stageOptions: ConnectionStage[] = ['DRAFT', 'AWAITING_APPROVAL', 'IMPLEMENTING', 'CONNECTIVITY_VALIDATION', 'API_UAT_VALIDATION', 'LIVE', 'TROUBLESHOOTING', 'BLOCKED'];

  constructor(
    public partnerIntegration: PartnerIntegrationService,
    private pdf: PartnerIntegrationPdfService,
    private route: ActivatedRoute,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.partners = this.partnerIntegration.getPartners();
    this.connections = this.partnerIntegration.getConnections();
    this.requests = this.partnerIntegration.getRequests();
    const health = this.route.snapshot.queryParamMap.get('health') as ConnectionHealth | null;
    const stage = this.route.snapshot.queryParamMap.get('stage') as ConnectionStage | null;
    if (health) this.selectedHealth = health;
    if (stage) this.selectedStage = stage;
  }

  get filteredConnections(): PartnerConnection[] {
    const query = this.searchValue.trim().toLowerCase();
    return this.connections.filter(connection => {
      const matchesQuery = !query
        || connection.name.toLowerCase().includes(query)
        || this.partnerName(connection.partnerId).toLowerCase().includes(query)
        || connection.serviceApi.toLowerCase().includes(query)
        || connection.environment.toLowerCase().includes(query);

      if (!matchesQuery) return false;
      if (this.selectedHealth !== 'ALL' && connection.health !== this.selectedHealth) return false;
      if (this.selectedStage !== 'ALL' && connection.stage !== this.selectedStage) return false;
      if (this.selectedEnvironment !== 'ALL' && connection.environment !== this.selectedEnvironment) return false;
      if (this.selectedService !== 'ALL' && connection.serviceApi !== this.selectedService) return false;
      return true;
    });
  }

  get pagedConnections(): PartnerConnection[] {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.filteredConnections.slice(start, start + this.pageSize);
  }

  get services(): string[] {
    return [...new Set(this.connections.map(connection => connection.serviceApi).filter(Boolean))].sort();
  }

  get environments(): string[] {
    return [...new Set(this.connections.map(connection => connection.environment).filter(Boolean))].sort();
  }

  resetPage(): void {
    this.pageIndex = 1;
  }

  partnerName(partnerId: string): string {
    return this.partners.find(partner => partner.id === partnerId)?.name || 'Partner';
  }

  peersLabel(connection: PartnerConnection): string {
    return connection.publicPeerIps?.length ? connection.publicPeerIps.join(', ') : connection.publicIp || '-';
  }

  endpointsLabel(connection: PartnerConnection): string {
    if (connection.privateEndpoints?.length) {
      return connection.privateEndpoints
        .map(endpoint => `${endpoint.environment}: ${endpoint.ip || '-'}:${endpoint.port || '-'}`)
        .join(' | ');
    }

    return connection.partnerServerIp || '-';
  }

  openConnection(connection: PartnerConnection): void {
    this.router.navigate(['/app/connection', connection.id]);
  }

  openActiveRequest(connection: PartnerConnection): void {
    if (connection.activeRequestId) this.router.navigate(['/app/request', connection.activeRequestId]);
  }

  openPartner(connection: PartnerConnection): void {
    this.router.navigate(['/app/partner', connection.partnerId]);
  }

  downloadConnections(): void {
    const scope = [
      this.selectedHealth === 'ALL' ? '' : this.partnerIntegration.connectionHealthLabel(this.selectedHealth),
      this.selectedStage === 'ALL' ? '' : this.partnerIntegration.connectionStageLabel(this.selectedStage),
      this.selectedEnvironment === 'ALL' ? '' : this.selectedEnvironment,
      this.selectedService === 'ALL' ? '' : this.selectedService,
      this.searchValue.trim() ? `SEARCH_${this.searchValue.trim()}` : ''
    ].filter(Boolean).join(' / ') || 'All Connections';

    this.pdf.downloadConnectionList(this.filteredConnections, this.partners, this.requests, scope);
  }
}
