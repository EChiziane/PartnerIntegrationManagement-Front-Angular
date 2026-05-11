import {Injectable} from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {CarLoad} from '@shared/models/carload';
import {Sprint} from '@shared/models/sprint';

export interface SprintReportMetrics {
  totalCarloads: number;
  totalAgendados: number;
  totalEntregue: number;
  totalRevenue: number;
  totalSpent: number;
  netProfit: number;
  roi: number;
  targetCarloads: number;
  targetRevenue: number;
  targetCarloadProgress: number;
  targetRevenueProgress: number;
  topVolume: string;
}

@Injectable({
  providedIn: 'root'
})
export class SprintDetailPdfService {

  downloadSprintReport(sprint: Sprint | null, sprintName: string, carloads: CarLoad[], metrics: SprintReportMetrics): void {
    const doc = new jsPDF({orientation: 'landscape'});
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const generatedAt = this.formatDateTime(new Date());
    const campaignCode = sprint?.code || 'campanha';

    this.drawHeader(doc, pageWidth, margin);
    this.drawInfoPanel(doc, margin, 46, contentWidth, 36, [
      ['Codigo', campaignCode],
      ['Campanha', sprintName || '-'],
      ['Canal', sprint?.campaignChannel || '-'],
      ['Material foco', sprint?.materialFocus || '-'],
      ['Periodo', `${this.formatDate(sprint?.startDate)} ate ${this.formatDate(sprint?.expectedEndDate)}`],
      ['Volumes promovidos', sprint?.volumesPromoted || sprint?.campaignProducts || '-'],
      ['Criada por', sprint?.createdByName || 'Sistema'],
      ['Gerado em', generatedAt]
    ]);

    const metricY = 92;
    const metricWidth = (contentWidth - 35) / 6;
    this.drawMetric(doc, margin, metricY, metricWidth, 'Carradas', `${metrics.totalCarloads}`, [14, 124, 114]);
    this.drawMetric(doc, margin + (metricWidth + 7) * 1, metricY, metricWidth, 'Entregues', `${metrics.totalEntregue}`, [34, 197, 94]);
    this.drawMetric(doc, margin + (metricWidth + 7) * 2, metricY, metricWidth, 'Agendadas', `${metrics.totalAgendados}`, [59, 130, 246]);
    this.drawMetric(doc, margin + (metricWidth + 7) * 3, metricY, metricWidth, 'Investimento', `${this.money(sprint?.marketingBudget)} Mts`, [234, 179, 8]);
    this.drawMetric(doc, margin + (metricWidth + 7) * 4, metricY, metricWidth, 'Receita', `${this.money(metrics.totalRevenue)} Mts`, [14, 124, 114]);
    this.drawMetric(doc, margin + (metricWidth + 7) * 5, metricY, metricWidth, 'ROI', `${metrics.roi.toFixed(1)}%`, [99, 102, 241]);

    this.drawSectionTitle(doc, 'Desempenho da campanha', margin, 132);
    autoTable(doc, {
      startY: 137,
      margin: {left: margin, right: margin},
      theme: 'grid',
      head: [['Indicador', 'Valor', 'Leitura']],
      body: [
        ['Meta de carradas', `${metrics.totalEntregue}/${metrics.targetCarloads || 0}`, `${metrics.targetCarloadProgress.toFixed(1)}% concluido`],
        ['Meta de receita', `${this.money(metrics.totalRevenue)} / ${this.money(metrics.targetRevenue)} Mts`, `${metrics.targetRevenueProgress.toFixed(1)}% concluido`],
        ['Volume mais vendido', metrics.topVolume, 'Baseado nas carradas nao canceladas'],
        ['Gastos operacionais', `${this.money(metrics.totalSpent)} Mts`, 'Soma dos gastos das carradas filtradas'],
        ['Lucro liquido', `${this.money(metrics.netProfit)} Mts`, 'Receita - gastos - investimento'],
        ['Encerramento', `${sprint?.closedByName || '-'} / ${this.formatDateTime(sprint?.closedAt)}`, 'Auditoria da campanha']
      ],
      styles: this.tableStyles(8.2, 3),
      headStyles: this.headStyles([14, 124, 114]),
      alternateRowStyles: {fillColor: [248, 251, 253]},
      columnStyles: {
        0: {cellWidth: 48, fontStyle: 'bold'},
        1: {cellWidth: 68},
        2: {cellWidth: contentWidth - 116}
      }
    });

    const tableStartY = ((doc as any).lastAutoTable?.finalY || 168) + 10;
    this.drawSectionTitle(doc, 'Carradas da campanha', margin, tableStartY - 4);

    const rows = carloads.map(item => [
      item.customerName || '-',
      item.deliveryDestination || '-',
      item.transportedMaterial || '-',
      item.assignedDriverName || '-',
      this.statusLabel(item.deliveryStatus),
      this.formatDateTime(item.deliveryScheduledDate),
      this.formatDateTime(item.deliveryDate),
      `${this.money(item.totalEarnings)} Mts`,
      `${this.money(item.totalSpent)} Mts`
    ]);

    autoTable(doc, {
      startY: tableStartY,
      margin: {left: margin, right: margin, bottom: 20},
      head: [['Cliente', 'Destino', 'Material', 'Motorista', 'Estado', 'Agendado', 'Entregue', 'Ganhos', 'Gastos']],
      body: rows.length ? rows : [['-', 'Sem carradas registadas', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'grid',
      styles: {...this.tableStyles(7.4, 2.4), overflow: 'linebreak'},
      headStyles: this.headStyles([16, 33, 43]),
      alternateRowStyles: {fillColor: [248, 251, 253]},
      columnStyles: {
        0: {cellWidth: 34},
        1: {cellWidth: 38},
        2: {cellWidth: 31},
        3: {cellWidth: 30},
        4: {cellWidth: 24},
        5: {cellWidth: 28},
        6: {cellWidth: 28},
        7: {cellWidth: 28, halign: 'right'},
        8: {cellWidth: 26, halign: 'right'}
      },
      didDrawPage: () => this.drawFooter(doc, margin, pageWidth, pageHeight)
    });

    doc.save(`campanha_${this.fileSafe(campaignCode || sprintName)}.pdf`);
  }

  private drawHeader(doc: jsPDF, pageWidth: number, margin: number): void {
    doc.setFillColor(16, 33, 43);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setFillColor(14, 124, 114);
    doc.roundedRect(margin, 9, 18, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TC', margin + 9, 21, {align: 'center'});
    doc.setFontSize(18);
    doc.text('RELATORIO DA CAMPANHA', 38, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Analise comercial e operacional', 38, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Transportes Chiziane', pageWidth - margin, 14, {align: 'right'});
    doc.setFont('helvetica', 'normal');
    doc.text('Bairro Cumbe km16', pageWidth - margin, 20, {align: 'right'});
    doc.text('Av. de Mocambique 2063', pageWidth - margin, 25, {align: 'right'});
    doc.text('Tel: 845098583 / 879985279', pageWidth - margin, 30, {align: 'right'});
  }

  private drawInfoPanel(doc: jsPDF, x: number, y: number, width: number, height: number, rows: Array<[string, string]>): void {
    doc.setDrawColor(223, 234, 240);
    doc.setFillColor(248, 251, 253);
    doc.roundedRect(x, y, width, height, 3, 3, 'FD');

    rows.forEach(([label, value], index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const columnWidth = width / 4;
      const itemX = x + 5 + column * columnWidth;
      const itemY = y + 9 + row * 15;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(99, 115, 129);
      doc.text(label.toUpperCase(), itemX, itemY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(16, 33, 43);
      doc.text(doc.splitTextToSize(value || '-', columnWidth - 10), itemX, itemY + 5);
    });
  }

  private drawMetric(doc: jsPDF, x: number, y: number, width: number, title: string, value: string, accent: [number, number, number]): void {
    doc.setDrawColor(223, 234, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, 26, 3, 3, 'FD');
    doc.setFillColor(...accent);
    doc.roundedRect(x, y, 3, 26, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(99, 115, 129);
    doc.text(title.toUpperCase(), x + 7, y + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(16, 33, 43);
    doc.text(doc.splitTextToSize(value, width - 12), x + 7, y + 18);
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
    doc.text('Documento gerado por Transportes Chiziane', margin, pageHeight - 8);
    doc.text(`Pagina ${pageNumber} de ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, {align: 'right'});
  }

  private tableStyles(fontSize: number, cellPadding: number): any {
    return {
      fontSize,
      cellPadding,
      textColor: [41, 55, 70] as [number, number, number],
      lineColor: [224, 231, 239] as [number, number, number],
      lineWidth: 0.2
    };
  }

  private headStyles(fillColor: [number, number, number]): any {
    return {
      fillColor,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const
    };
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

  private formatDate(value: string | number | Date | null | undefined): string {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return `${this.pad(date.getDate())}/${this.pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  private formatDateTime(value: string | number | Date | null | undefined): string {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return `${this.formatDate(date)} ${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`;
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  private fileSafe(value: string): string {
    return value.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'campanha';
  }
}
