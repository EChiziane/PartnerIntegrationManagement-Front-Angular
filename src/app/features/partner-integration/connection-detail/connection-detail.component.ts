import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerConnection, PartnerRequest, TimelineEvent} from '@shared/models/partner-integration';

@Component({
  selector: 'app-connection-detail',
  standalone: false,
  templateUrl: './connection-detail.component.html',
  styleUrls: ['./connection-detail.component.scss']
})
export class ConnectionDetailComponent implements OnInit {
  connection: PartnerConnection | undefined;
  partner: Partner | undefined;
  requests: PartnerRequest[] = [];
  events: TimelineEvent[] = [];

  constructor(
    public partnerIntegration: PartnerIntegrationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.connection = this.partnerIntegration.getConnection(id);
    this.partner = this.connection ? this.partnerIntegration.getPartner(this.connection.partnerId) : undefined;
    this.requests = this.connection ? this.partnerIntegration.getConnectionRequests(this.connection.id) : [];
    this.events = this.connection ? this.partnerIntegration.getConnectionEvents(this.connection.id) : [];
  }

  get activeRequest(): PartnerRequest | undefined {
    return this.requests.find(request => request.currentStatus !== 'CLOSED');
  }

  peersLabel(): string {
    return this.connection?.publicPeerIps?.length ? this.connection.publicPeerIps.join(', ') : this.connection?.publicIp || '-';
  }

  endpointsLabel(): string {
    const endpoints = this.connection?.privateEndpoints || [];
    if (endpoints.length) {
      return endpoints.map(endpoint => `${endpoint.environment}: ${endpoint.ip || '-'}:${endpoint.port || '-'}`).join(' | ');
    }

    return this.connection?.partnerServerIp || '-';
  }

  openPartner(): void {
    if (this.partner) this.router.navigate(['/app/partner', this.partner.id]);
  }

  openRequest(request: PartnerRequest): void {
    this.router.navigate(['/app/request', request.id]);
  }

  startRequest(type: PartnerRequest['type']): void {
    if (!this.connection) return;
    const request = this.partnerIntegration.createRequest(this.connection.partnerId, type, {connectionId: this.connection.id});
    this.router.navigate(['/app/request', request.id]);
  }
}
