import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {Partner, PartnerRequest, TimelineEvent} from '@shared/models/partner-integration';

@Component({
  selector: 'app-request-detail',
  standalone: false,
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.scss']
})
export class RequestDetailComponent implements OnInit {
  request: PartnerRequest | undefined;
  partner: Partner | undefined;
  events: TimelineEvent[] = [];

  constructor(
    public partnerIntegration: PartnerIntegrationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.request = this.partnerIntegration.getRequest(id);
    this.partner = this.request ? this.partnerIntegration.getPartner(this.request.partnerId) : undefined;
    this.events = this.request ? this.partnerIntegration.getEvents(this.request.id) : [];
  }

  action(label: string, patch: Partial<PartnerRequest>): void {
    if (!this.request) return;
    this.partnerIntegration.updateRequest(this.request.id, patch, label);
    this.load();
  }

  back(): void {
    this.router.navigate(['/app/pipeline']);
  }
}
