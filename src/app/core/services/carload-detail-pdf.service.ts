import {Injectable} from '@angular/core';
import type jsPDF from 'jspdf';

import {CarLoad} from '@shared/models/carload';
import {Driver} from '@shared/models/driver';
import {Manager} from '@shared/models/manager';
import {Sprint} from '@shared/models/sprint';
import {DocumentFilenameService} from '@core/services/document-filename.service';
import {COMPANY_PROFILE} from '@shared/data/company-profile';

@Injectable({
  providedIn: 'root'
})
export class CarloadDetailPdfService {
  constructor(private documentFilename: DocumentFilenameService) {
  }

  downloadCarloadReport(
    carload: CarLoad,
    driver: Driver | null,
    manager: Manager | null,
    sprint: Sprint | null
  ): Promise<void> {
    return this.createCarloadReport(carload, driver, manager, sprint);
  }

  private async createCarloadReport(
    carload: CarLoad,
    driver: Driver | null,
    manager: Manager | null,
    sprint: Sprint | null
  ): Promise<void> {
    const [{default: JsPDF}, {default: autoTableModule}] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const autoTable = autoTableModule;
    const doc = new JsPDF({orientation: 'landscape'});
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const issueDate = this.formatDate(new Date());
    const marginValue = Number(carload.totalEarnings || 0) - Number(carload.totalSpent || 0);

    this.drawHeader(doc, 'Ficha da carrada', `Emitido em ${issueDate}`);
    this.drawMetricCard(doc, margin, 52, 78, 'Estado', this.statusLabel(carload.deliveryStatus));
    this.drawMetricCard(doc, margin + 88, 52, 78, 'Receita', `${this.money(carload.totalEarnings)} Mts`);
    this.drawMetricCard(doc, margin + 176, 52, 78, 'Margem estimada', `${this.money(marginValue)} Mts`);

    this.drawSectionTitle(doc, 'Resumo da carrada', margin, 92);
    this.drawInfoPanel(doc, margin, 98, contentWidth, [
      ['Cliente', carload.customerName || '-'],
      ['Telefone', carload.customerPhoneNumber || '-'],
      ['Destino', carload.deliveryDestination || '-'],
      ['Material', carload.transportedMaterial || '-'],
      ['Tipo', this.typeLabel(carload.carloadType)],
      ['Agendada para', this.formatDateTime(carload.deliveryScheduledDate)],
      ['Entregue em', this.formatDateTime(carload.deliveryDate)],
      ['Criado por', carload.createdByName || 'Sistema']
    ]);

    this.drawSectionTitle(doc, 'Operacao', margin, 154);
    this.drawInfoPanel(doc, margin, 160, contentWidth, [
      ['Motorista', driver?.Name || carload.assignedDriverName || '-'],
      ['Contacto motorista', driver?.Phone || '-'],
      ['Viatura', driver?.CarDescription || '-'],
      ['Gestor', manager?.name || carload.logisticsManagerName || '-'],
      ['Contacto gestor', manager?.contact || '-'],
      ['Sprint', sprint?.name || carload.carloadBatchName || '-'],
      ['Código sprint', sprint?.code || '-'],
      ['Criado em', this.formatDateTime(carload.createdAt)]
    ]);

    this.drawFinancialTable(doc, autoTable, carload, margin, 216);
    this.drawFooter(doc);
    doc.save(this.documentFilename.build('CARRADA', this.resolveCarloadCode(carload), carload.customerName || carload.deliveryDestination));
  }

  private drawFinancialTable(
    doc: jsPDF,
    autoTable: typeof import('jspdf-autotable').default,
    carload: CarLoad,
    margin: number,
    startY: number
  ): void {
    const spent = Number(carload.totalSpent || 0);
    const earnings = Number(carload.totalEarnings || 0);
    const marginValue = earnings - spent;

    autoTable(doc, {
      startY,
      margin: {left: margin, right: margin},
      head: [['Indicador', 'Valor']],
      body: [
        ['Gastos', `${this.money(spent)} Mts`],
        ['Receita', `${this.money(earnings)} Mts`],
        ['Margem estimada', `${this.money(marginValue)} Mts`]
      ],
      styles: {
        cellPadding: 4,
        font: 'helvetica',
        fontSize: 9,
        lineColor: [224, 231, 239],
        lineWidth: 0.2,
        textColor: [41, 55, 70]
      },
      headStyles: {
        fillColor: [23, 32, 29],
        fontStyle: 'bold',
        textColor: [255, 255, 255]
      },
      alternateRowStyles: {
        fillColor: [248, 251, 253]
      },
      columnStyles: {
        1: {halign: 'right'}
      }
    });
  }

  private drawHeader(doc: jsPDF, title: string, caption: string): void {
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(23, 32, 29);
    doc.rect(0, 0, pageWidth, 42, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(COMPANY_PROFILE.tradeName, 14, 16);

    doc.setFontSize(10);
    doc.setTextColor(228, 173, 84);
    doc.text(title, 14, 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(219, 231, 236);
    doc.text(COMPANY_PROFILE.activity, 14, 34);
    doc.text(`${COMPANY_PROFILE.legalName} | NUIT: ${COMPANY_PROFILE.nuit}`, 14, 39);

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(caption, pageWidth - 14, 20, {align: 'right'});
  }

  private drawMetricCard(doc: jsPDF, x: number, y: number, width: number, label: string, value: string): void {
    doc.setFillColor(248, 251, 253);
    doc.setDrawColor(224, 231, 239);
    doc.roundedRect(x, y, width, 26, 3, 3, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(99, 115, 129);
    doc.text(label, x + 5, y + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(23, 32, 29);
    doc.text(doc.splitTextToSize(value, width - 10), x + 5, y + 18);
  }

  private drawSectionTitle(doc: jsPDF, title: string, x: number, y: number): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(23, 32, 29);
    doc.text(title, x, y);
  }

  private drawInfoPanel(doc: jsPDF, x: number, y: number, width: number, rows: Array<[string, string]>): void {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(224, 231, 239);
    doc.roundedRect(x, y, width, 42, 3, 3, 'FD');

    rows.forEach(([label, value], index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const columnWidth = width / 4;
      const itemX = x + 6 + column * columnWidth;
      const itemY = y + 10 + row * 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(99, 115, 129);
      doc.text(label, itemX, itemY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(41, 55, 70);
      doc.text(doc.splitTextToSize(value, columnWidth - 12), itemX, itemY + 5);
    });
  }

  private drawFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();

    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setDrawColor(224, 231, 239);
      doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(99, 115, 129);
      doc.text(`Documento emitido por ${COMPANY_PROFILE.legalName} | NUIT: ${COMPANY_PROFILE.nuit}`, 14, pageHeight - 10);
      doc.text(`Pagina ${page} de ${pageCount}`, pageWidth - 14, pageHeight - 10, {align: 'right'});
    }
  }

  private statusLabel(status: string | null | undefined): string {
    const value = (status || '').toUpperCase();
    if (value === 'SCHEDULED') return 'Agendada';
    if (value === 'IN_PROGRESS') return 'Em execução';
    if (value === 'DELIVERED') return 'Entregue';
    if (value === 'CANCELLED') return 'Cancelada';
    return status || '-';
  }

  private typeLabel(type: string | null | undefined): string {
    if (type === 'Produced') return 'Produzida';
    if (type === 'Sold') return 'Vendida';
    return type || '-';
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

  private resolveCarloadCode(carload: CarLoad): string {
    return carload.invoiceCode || carload.sourceQuoteCode || carload.id;
  }
}
