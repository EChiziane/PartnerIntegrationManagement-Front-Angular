import {Component} from '@angular/core';

interface UatScenario {
  areaKey: string;
  titleKey: string;
  expectedKey: string;
}

@Component({
  selector: 'app-uat-checklist',
  standalone: false,
  templateUrl: './uat-checklist.component.html',
  styleUrls: ['./uat-checklist.component.scss']
})
export class UatChecklistComponent {
  readonly scenarios: UatScenario[] = [
    {areaKey: 'uat.areas.partner', titleKey: 'uat.scenarios.partnerName.title', expectedKey: 'uat.scenarios.partnerName.expected'},
    {areaKey: 'uat.areas.partner', titleKey: 'uat.scenarios.partnerImport.title', expectedKey: 'uat.scenarios.partnerImport.expected'},
    {areaKey: 'uat.areas.connection', titleKey: 'uat.scenarios.statement.title', expectedKey: 'uat.scenarios.statement.expected'},
    {areaKey: 'uat.areas.connection', titleKey: 'uat.scenarios.implementation.title', expectedKey: 'uat.scenarios.implementation.expected'},
    {areaKey: 'uat.areas.testing', titleKey: 'uat.scenarios.testing.title', expectedKey: 'uat.scenarios.testing.expected'},
    {areaKey: 'uat.areas.update', titleKey: 'uat.scenarios.updateOpen.title', expectedKey: 'uat.scenarios.updateOpen.expected'},
    {areaKey: 'uat.areas.update', titleKey: 'uat.scenarios.updateClose.title', expectedKey: 'uat.scenarios.updateClose.expected'},
    {areaKey: 'uat.areas.risk', titleKey: 'uat.scenarios.risk.title', expectedKey: 'uat.scenarios.risk.expected'},
    {areaKey: 'uat.areas.control', titleKey: 'uat.scenarios.control.title', expectedKey: 'uat.scenarios.control.expected'},
    {areaKey: 'uat.areas.security', titleKey: 'uat.scenarios.security.title', expectedKey: 'uat.scenarios.security.expected'},
    {areaKey: 'uat.areas.language', titleKey: 'uat.scenarios.language.title', expectedKey: 'uat.scenarios.language.expected'},
    {areaKey: 'uat.areas.responsive', titleKey: 'uat.scenarios.responsive.title', expectedKey: 'uat.scenarios.responsive.expected'}
  ];
}
