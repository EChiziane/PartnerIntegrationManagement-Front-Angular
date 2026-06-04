import {Injectable} from '@angular/core';
import type jsPDF from 'jspdf';

import {CarLoad} from '@shared/models/carload';
import {DocumentFilenameService} from '@core/services/document-filename.service';
import {COMPANY_PDF_LINES, COMPANY_PROFILE} from '@shared/data/company-profile';

@Injectable({
  providedIn: 'root'
})
export class CarloadListPdfService {
  constructor(private documentFilename: DocumentFilenameService) {
  }

  async downloadCarloadListReport(carloads: CarLoad[], scopeLabel: string): Promise<void> {
    const [{default: JsPDF}, {default: autoTable}] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const doc = new JsPDF({orientation: 'landscape'});
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const totalRevenue = carloads.reduce((sum, item) => sum + Number(item.totalEarnings || 0), 0);
    const totalSpent = carloads.reduce((sum, item) => sum + Number(item.totalSpent || 0), 0);
    const marginValue = totalRevenue - totalSpent;

    this.drawHeader(doc, pageWidth, margin, scopeLabel);
    this.drawMetric(doc, margin, 52, 52, 'Carradas', String(carloads.length), [14, 124, 114]);
    this.drawMetric(doc, margin + 61, 52, 52, 'Agendadas', String(this.countByStatus(carloads, 'SCHEDULED')), [59, 130, 246]);
    this.drawMetric(doc, margin + 122, 52, 52, 'Em execucao', String(this.countByStatus(carloads, 'IN_PROGRESS')), [234, 179, 8]);
    this.drawMetric(doc, margin + 183, 52, 52, 'Entregues', String(this.countByStatus(carloads, 'DELIVERED')), [34, 197, 94]);
    this.drawMetric(doc, margin + 244, 52, 39, 'Canceladas', String(this.countByStatus(carloads, 'CANCELLED')), [239, 68, 68]);

    this.drawFinancialPanel(doc, margin, 88, contentWidth, [
      ['Receita total', `${this.money(totalRevenue)} Mts`],
      ['Gastos totais', `${this.money(totalSpent)} Mts`],
      ['Margem estimada', `${this.money(marginValue)} Mts`],
      ['Emitido em', this.formatDateTime(new Date())]
    ]);

    this.drawSectionTitle(doc, 'Lista de carradas', margin, 126);

    const rows = carloads.map(item => [
      item.customerName || '-',
      item.customerPhoneNumber || '-',
      item.deliveryDestination || '-',
      item.transportedMaterial || '-',
      item.assignedDriverName || '-',
      item.carloadBatchName || '-',
      this.statusLabel(item.deliveryStatus),
      this.formatDateTime(item.deliveryScheduledDate),
      this.formatDateTime(item.deliveryDate),
      `${this.money(item.totalEarnings)} Mts`,
      `${this.money(item.totalSpent)} Mts`
    ]);

    autoTable(doc, {
      startY: 132,
      margin: {left: margin, right: margin, bottom: 20},
      head: [[
        'Cliente',
        'Contacto',
        'Destino',
        'Material',
        'Motorista',
        'Sprint',
        'Estado',
        'Agendado',
        'Entregue',
        'Ganhos',
        'Gastos'
      ]],
      body: rows.length ? rows : [['-', 'Sem carradas para imprimir', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'grid',
      styles: {
        fontSize: 7.2,
        cellPadding: 2.2,
        textColor: [41, 55, 70],
        lineColor: [224, 231, 239],
        lineWidth: 0.2,
        overflow: 'linebreak',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [16, 33, 43],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 251, 253]
      },
      columnStyles: {
        0: {cellWidth: 28},
        1: {cellWidth: 25},
        2: {cellWidth: 33},
        3: {cellWidth: 28},
        4: {cellWidth: 28},
        5: {cellWidth: 28},
        6: {cellWidth: 24},
        7: {cellWidth: 25},
        8: {cellWidth: 25},
        9: {cellWidth: 26, halign: 'right'},
        10: {cellWidth: 25, halign: 'right'}
      },
      didDrawPage: () => this.drawFooter(doc, margin, pageWidth, pageHeight)
    });

    doc.save(this.documentFilename.build('RELATORIO_CARRADAS', 'REL-CARRADAS', scopeLabel));
  }

  private drawHeader(doc: jsPDF, pageWidth: number, margin: number, scopeLabel: string): void {
    doc.setFillColor(16, 33, 43);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setFillColor(14, 124, 114);
    doc.roundedRect(margin, 9, 18, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(COMPANY_PROFILE.initials, margin + 9, 21, {align: 'center'});
    doc.setFontSize(18);
    doc.text('RELATORIO DE CARRADAS', 38, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(scopeLabel, 38, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_PROFILE.tradeName, pageWidth - margin, 14, {align: 'right'});
    doc.setFont('helvetica', 'normal');
    doc.text(COMPANY_PDF_LINES[0], pageWidth - margin, 19, {align: 'right'});
    doc.text(COMPANY_PDF_LINES[1], pageWidth - margin, 24, {align: 'right'});
    doc.text(COMPANY_PDF_LINES[2], pageWidth - margin, 29, {align: 'right'});
    doc.text(COMPANY_PDF_LINES[4], pageWidth - margin, 34, {align: 'right'});
  }

  private drawMetric(doc: jsPDF, x: number, y: number, width: number, title: string, value: string, accent: [number, number, number]): void {
    doc.setDrawColor(223, 234, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, 24, 3, 3, 'FD');
    doc.setFillColor(...accent);
    doc.roundedRect(x, y, 3, 24, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(99, 115, 129);
    doc.text(title.toUpperCase(), x + 7, y + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(16, 33, 43);
    doc.text(value, x + 7, y + 17);
  }

  private drawFinancialPanel(doc: jsPDF, x: number, y: number, width: number, rows: Array<[string, string]>): void {
    doc.setDrawColor(223, 234, 240);
    doc.setFillColor(248, 251, 253);
    doc.roundedRect(x, y, width, 24, 3, 3, 'FD');

    const columnWidth = width / rows.length;
    rows.forEach(([label, value], index) => {
      const itemX = x + 6 + index * columnWidth;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(99, 115, 129);
      doc.text(label.toUpperCase(), itemX, y + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(16, 33, 43);
      doc.text(doc.splitTextToSize(value, columnWidth - 12), itemX, y + 15);
    });
  }

  private drawSectionTitle(doc: jsPDF, title: string, x: number, y: number): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(16, 33, 43);
    doc.text(title, x, y);
  }

  private drawFooter(doc: jsPDF, margin: number, pageWidth: number, pageHeight: number): void {
    const pageNumber = doc.getCurrentPageInfo().pageNumber;
    doc.setDrawColor(223, 234, 240);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(99, 115, 129);
    doc.text(`Documento gerado por ${COMPANY_PROFILE.legalName} | NUIT: ${COMPANY_PROFILE.nuit}`, margin, pageHeight - 8);
    doc.text(`Pagina ${pageNumber} de ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, {align: 'right'});
  }

  private countByStatus(carloads: CarLoad[], status: string): number {
    return carloads.filter(item => (item.deliveryStatus || '').toUpperCase() === status).length;
  }

  private statusLabel(status: string | null | undefined): string {
    const value = (status || '').toUpperCase();
    if (value === 'SCHEDULED') return 'Agendada';
    if (value === 'IN_PROGRESS') return 'Em execucao';
    if (value === 'DELIVERED') return 'Entregue';
    if (value === 'CANCELLED') return 'Cancelada';
    return status || '-';
  }

  private money(value: number | null | undefined): string {
    return Number(value || 0).toFixed(2);
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
