import {Injectable} from '@angular/core';
import type jsPDF from 'jspdf';

import {DocumentFilenameService} from '@core/services/document-filename.service';
import {
  Partner,
  PartnerRequest,
  TimelineEvent,
  WorkflowStatus
} from '@shared/models/partner-integration';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';

@Injectable({providedIn: 'root'})
export class PartnerIntegrationPdfService {
  constructor(
    private documentFilename: DocumentFilenameService,
    private partnerIntegration: PartnerIntegrationService
  ) {
  }

  async downloadPartnerList(partners: Partner[], requests: PartnerRequest[], scopeLabel: string): Promise<void> {
    const [{default: JsPDF}, {default: autoTable}] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const doc = new JsPDF({orientation: 'landscape'});
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    this.drawHeader(doc, 'PARTNER LIST', scopeLabel);
    this.drawSummaryTable(doc, autoTable, margin, 26, [
      ['Partners', String(partners.length)],
      ['Open Requests', String(this.openRequestCount(requests))],
      ['Attention', String(this.attentionCount(requests))],
      ['Active', String(partners.filter(item => item.status === 'ACTIVE').length)]
    ]);

    autoTable(doc, {
      startY: 44,
      margin: {left: margin, right: margin, bottom: 20},
      head: [[
        'Partner',
        'Category',
        'Business Owner',
        'Technical Contact',
        'Environment',
        'Public IP',
        'Server IP',
        'Ports',
        'Open',
        'Urgent Status',
        'Next Action'
      ]],
      body: partners.map(partner => {
        const partnerRequests = requests.filter(request => request.partnerId === partner.id);
        const urgent = this.mostUrgentStatus(partnerRequests);
        const next = partnerRequests.find(request => request.currentStatus === urgent)?.nextAction || '-';

        return [
          partner.name || '-',
          this.partnerCategory(partner),
          partner.businessOwner || '-',
          partner.technicalContact || '-',
          partner.environment || '-',
          partner.publicIp || '-',
          partner.partnerServerIp || '-',
          `${partner.uatPort || '-'} / ${partner.prdPort || '-'}`,
          String(partnerRequests.filter(request => request.currentStatus !== 'CLOSED').length),
          urgent ? this.partnerIntegration.statusLabel(urgent) : 'Clear',
          next
        ];
      }),
      theme: 'grid',
      styles: this.tableStyles(),
      headStyles: this.headStyles(),
      didDrawPage: () => this.drawFooter(doc, pageWidth, pageHeight)
    });

    doc.save(this.documentFilename.build('PARTNERS', 'LIST', scopeLabel));
  }

  async downloadPipeline(requests: PartnerRequest[], partners: Partner[], scopeLabel: string): Promise<void> {
    const [{default: JsPDF}, {default: autoTable}] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const doc = new JsPDF({orientation: 'landscape'});
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    this.drawHeader(doc, 'PIPELINE REPORT', scopeLabel);
    this.drawSummaryTable(doc, autoTable, margin, 26, [
      ['Requests', String(requests.length)],
      ['Open', String(this.openRequestCount(requests))],
      ['Closed', String(requests.filter(item => item.currentStatus === 'CLOSED').length)],
      ['Attention', String(this.attentionCount(requests))]
    ]);

    autoTable(doc, {
      startY: 44,
      margin: {left: margin, right: margin, bottom: 20},
      head: [[
        'Partner',
        'Request Type',
        'Status',
        'Owner',
        'Next Action',
        'Priority',
        'Open Date',
        'Follow-up',
        'Stage Start',
        'Blocker'
      ]],
      body: requests.map(request => [
        partners.find(partner => partner.id === request.partnerId)?.name || '-',
        this.partnerIntegration.typeLabel(request.type),
        this.partnerIntegration.statusLabel(request.currentStatus),
        request.currentOwner || '-',
        request.nextAction || '-',
        request.priority || '-',
        request.openDate || '-',
        request.followUpDate || '-',
        request.stageStartDate || '-',
        request.blocker || '-'
      ]),
      theme: 'grid',
      styles: this.tableStyles(),
      headStyles: this.headStyles(),
      didDrawPage: () => this.drawFooter(doc, pageWidth, pageHeight)
    });

    doc.save(this.documentFilename.build('PIPELINE', 'REQUESTS', scopeLabel));
  }

  async downloadPartnerProfile(partner: Partner, requests: PartnerRequest[], events: TimelineEvent[]): Promise<void> {
    const [{default: JsPDF}, {default: autoTable}] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const doc = new JsPDF({orientation: 'landscape'});
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    this.drawHeader(doc, 'PARTNER PROFILE', partner.name);
    this.drawSummaryTable(doc, autoTable, margin, 26, [
      ['Status', partner.status],
      ['Open Requests', String(requests.filter(item => item.currentStatus !== 'CLOSED').length)],
      ['Category', this.partnerCategory(partner)]
    ]);

    autoTable(doc, {
      startY: 44,
      margin: {left: margin, right: margin, bottom: 20},
      head: [['Field', 'Value', 'Field', 'Value']],
      body: this.pairRows([
      ['Business Owner', partner.businessOwner || '-'],
      ['Technical Contact', partner.technicalContact || '-'],
      ['Phone', partner.phone || '-'],
      ['Email', partner.email || '-'],
      ['Service/API', partner.serviceApi || '-'],
      ['Environment', partner.environment || '-'],
      ['Public IP', partner.publicIp || '-'],
      ['Server IP', partner.partnerServerIp || '-'],
      ['UAT Port', partner.uatPort || '-'],
      ['PRD Port', partner.prdPort || '-'],
      ['Last Activity', partner.lastActivity || '-'],
      ['Partner ID', partner.id || '-']
      ]),
      theme: 'grid',
      styles: this.tableStyles(),
      headStyles: this.headStyles(),
      didDrawPage: () => this.drawFooter(doc, pageWidth, pageHeight)
    });

    const profileFinalY = (doc as any).lastAutoTable?.finalY || 82;

    autoTable(doc, {
      startY: profileFinalY + 8,
      margin: {left: margin, right: margin, bottom: 20},
      head: [['Request Type', 'Status', 'Owner', 'Next Action', 'Priority', 'Open Date', 'Follow-up', 'Blocker']],
      body: requests.map(request => [
        this.partnerIntegration.typeLabel(request.type),
        this.partnerIntegration.statusLabel(request.currentStatus),
        request.currentOwner || '-',
        request.nextAction || '-',
        request.priority || '-',
        request.openDate || '-',
        request.followUpDate || '-',
        request.blocker || '-'
      ]),
      theme: 'grid',
      styles: this.tableStyles(),
      headStyles: this.headStyles(),
      didDrawPage: () => this.drawFooter(doc, pageWidth, pageHeight)
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 190;
    autoTable(doc, {
      startY: finalY + 12,
      margin: {left: margin, right: margin, bottom: 20},
      head: [['Date', 'Event', 'Description']],
      body: events.length ? events.map(event => [
        this.formatDateTime(event.date),
        event.title,
        event.description
      ]) : [['-', 'No history', '-']],
      theme: 'grid',
      styles: this.tableStyles(),
      headStyles: this.headStyles(),
      didDrawPage: () => this.drawFooter(doc, pageWidth, pageHeight)
    });

    doc.save(this.documentFilename.build('PARTNER_PROFILE', partner.id, partner.name));
  }

  partnerCategory(partner: Partner): string {
    const value = `${partner.serviceApi || ''} ${partner.name || ''}`.toLowerCase();
    if (value.includes('payment')) return 'Payment API';
    if (value.includes('ussd')) return 'USSD / Push USSD';
    if (value.includes('remittance')) return 'Remittance';
    if (value.includes('connectivity')) return 'Connectivity';
    if (value.includes('gaming') || value.includes('lotto') || value.includes('bet')) return 'Gaming';
    return 'Other';
  }

  private drawHeader(doc: jsPDF, title: string, caption: string): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setDrawColor(190, 198, 207);
    doc.line(14, 20, pageWidth - 14, 20);
    doc.setTextColor(20, 27, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, 14, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(74, 85, 99);
    doc.text(caption || 'Partner Integration Management App', 14, 16);
    doc.text(`Generated ${this.formatDateTime(new Date())}`, pageWidth - 14, 11, {align: 'right'});
    doc.text('Partner Integration Management App', pageWidth - 14, 16, {align: 'right'});
  }

  private drawSummaryTable(
    doc: jsPDF,
    autoTable: typeof import('jspdf-autotable').default,
    margin: number,
    startY: number,
    rows: Array<[string, string]>
  ): void {
    autoTable(doc, {
      startY,
      margin: {left: margin, right: margin},
      body: [rows.flatMap(([label, value]) => [label, value || '-'])],
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1.6,
        lineColor: [205, 213, 223],
        lineWidth: 0.15,
        textColor: [20, 27, 35],
        minCellHeight: 6
      },
      columnStyles: rows.reduce((styles, _, index) => {
        styles[String(index * 2)] = {fontStyle: 'bold', fillColor: [245, 247, 250], cellWidth: 24};
        styles[String(index * 2 + 1)] = {cellWidth: 36};
        return styles;
      }, {} as Record<string, Partial<import('jspdf-autotable').Styles>>)
    });
  }

  private drawFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
    const pageNumber = doc.getCurrentPageInfo().pageNumber;
    doc.setDrawColor(223, 234, 240);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(99, 115, 129);
    doc.text('Partner Integration Management App | Local V1 operational report', 14, pageHeight - 8);
    doc.text(`Page ${pageNumber} of ${doc.getNumberOfPages()}`, pageWidth - 14, pageHeight - 8, {align: 'right'});
  }

  private tableStyles(): Record<string, unknown> {
    return {
      fontSize: 7.2,
      cellPadding: 1.8,
      textColor: [20, 27, 35],
      lineColor: [205, 213, 223],
      lineWidth: 0.15,
      overflow: 'linebreak',
      valign: 'middle'
    };
  }

  private headStyles(): Record<string, unknown> {
    return {
      fillColor: [238, 242, 246],
      textColor: [20, 27, 35],
      fontStyle: 'bold'
    };
  }

  private pairRows(rows: Array<[string, string]>): string[][] {
    const output: string[][] = [];
    for (let index = 0; index < rows.length; index += 2) {
      const first = rows[index];
      const second = rows[index + 1] || ['', ''];
      output.push([first[0], first[1], second[0], second[1]]);
    }
    return output;
  }

  private mostUrgentStatus(requests: PartnerRequest[]): WorkflowStatus | null {
    const openRequests = requests.filter(request => request.currentStatus !== 'CLOSED');
    if (!openRequests.length) return null;
    const score: Partial<Record<WorkflowStatus, number>> = {
      TROUBLESHOOTING: 1,
      READY_CONNECTIVITY: 2,
      READY_UAT: 3,
      READY_HANDOVER: 4,
      FORM_VALIDATION: 5,
      READY_STATEMENT: 6,
      IMPLEMENTATION: 7,
      WAITING_SIGNATURES: 8,
      WAITING_FORM: 9,
      NEW: 10
    };
    return [...openRequests].sort((a, b) => (score[a.currentStatus] || 20) - (score[b.currentStatus] || 20))[0].currentStatus;
  }

  private openRequestCount(requests: PartnerRequest[]): number {
    return requests.filter(item => item.currentStatus !== 'CLOSED').length;
  }

  private attentionCount(requests: PartnerRequest[]): number {
    return requests.filter(item => item.currentStatus === 'TROUBLESHOOTING' || item.priority === 'P1').length;
  }

  private formatDateTime(value: string | number | Date | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return `${this.pad(date.getDate())}/${this.pad(date.getMonth() + 1)}/${date.getFullYear()} ${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`;
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }
}
