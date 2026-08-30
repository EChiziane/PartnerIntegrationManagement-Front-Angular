import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerConnection} from '@shared/models/partner-integration';

@Component({
  selector: 'app-connections',
  standalone: false,
  templateUrl: './connections.component.html',
  styleUrls: ['./connections.component.scss']
})
export class ConnectionsComponent implements OnInit {
  partners: Partner[] = [];
  connections: PartnerConnection[] = [];
  searchValue = '';

  constructor(
    public partnerIntegration: PartnerIntegrationService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.partners = this.partnerIntegration.getPartners();
    this.connections = this.partnerIntegration.getConnections();
  }

  get filteredConnections(): PartnerConnection[] {
    const query = this.searchValue.trim().toLowerCase();
    if (!query) return this.connections;

    return this.connections.filter(connection =>
      connection.name.toLowerCase().includes(query)
      || this.partnerName(connection.partnerId).toLowerCase().includes(query)
      || connection.serviceApi.toLowerCase().includes(query)
      || connection.environment.toLowerCase().includes(query)
      || this.peersLabel(connection).toLowerCase().includes(query)
      || this.endpointsLabel(connection).toLowerCase().includes(query)
    );
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

  openPartner(connection: PartnerConnection): void {
    this.router.navigate(['/app/partner', connection.partnerId]);
  }
}
