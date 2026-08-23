import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {ScanItem} from '@shared/models/partner-integration';

@Component({
  selector: 'app-scan',
  standalone: false,
  templateUrl: './scan.component.html',
  styleUrls: ['./scan.component.scss']
})
export class ScanComponent implements OnInit {
  scanMode: 'AM' | 'PM' = 'AM';
  scanItems: ScanItem[] = [];

  constructor(
    public partnerIntegration: PartnerIntegrationService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.scanItems = this.partnerIntegration.getScanItems();
  }

  openRequest(item: ScanItem): void {
    this.router.navigate(['/app/request', item.requestId]);
  }
}
