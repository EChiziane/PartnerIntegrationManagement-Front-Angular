import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerRequest, RequestType, TimelineEvent} from '@shared/models/partner-integration';
import {PartnerIntegrationPdfService} from '@core/services/partner-integration-pdf.service';

@Component({
  selector: 'app-partner-detail',
  standalone: false,
  templateUrl: './partner-detail.component.html',
  styleUrls: ['./partner-detail.component.scss']
})
export class PartnerDetailComponent implements OnInit {
  partner: Partner | undefined;
  requests: PartnerRequest[] = [];
  events: TimelineEvent[] = [];
  requestType: RequestType = 'NEW_INTEGRATION';

  constructor(
    public partnerIntegration: PartnerIntegrationService,
    private pdf: PartnerIntegrationPdfService,
    private route: ActivatedRoute,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.partner = this.partnerIntegration.getPartner(id);
    this.requests = this.partnerIntegration.getRequests().filter(request => request.partnerId === id);
    this.events = this.requests.flatMap(request => this.partnerIntegration.getEvents(request.id));
  }

  openRequest(request: PartnerRequest): void {
    this.router.navigate(['/app/request', request.id]);
  }

  createRequest(): void {
    if (!this.partner) return;
    const request = this.partnerIntegration.createRequest(this.partner.id, this.requestType);
    this.router.navigate(['/app/request', request.id]);
  }

  startUpdateFlow(): void {
    if (!this.partner) return;
    const request = this.partnerIntegration.createRequest(this.partner.id, 'UPDATE_INTEGRATION');
    this.router.navigate(['/app/request', request.id]);
  }

  downloadProfile(): void {
    if (!this.partner) return;
    this.pdf.downloadPartnerProfile(this.partner, this.requests, this.events);
  }
}
