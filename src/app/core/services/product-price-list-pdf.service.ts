import {Injectable} from '@angular/core';
import type jsPDF from 'jspdf';

import {ProductPrice} from '@shared/models/product-price';
import {DocumentFilenameService} from '@core/services/document-filename.service';
import {COMPANY_PDF_LINES, COMPANY_PROFILE} from '@shared/data/company-profile';

@Injectable({
  providedIn: 'root'
})
export class ProductPriceListPdfService {
  constructor(private documentFilename: DocumentFilenameService) {
  }

  async downloadPriceList(prices: ProductPrice[]): Promise<void> {
    const [{default: JsPDF}, {default: autoTable}] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const sortedPrices = [...prices].sort((a, b) => this.sortByVolumeAndProduct(a, b));
    const doc = new JsPDF({orientation: 'portrait'});
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const generatedAt = this.formatDateTime(new Date());

    this.drawHeader(doc, pageWidth, margin);
    this.drawInfoPanel(doc, margin, 46, contentWidth, [
      ['Produtos', String(sortedPrices.length)],
      ['Menor volume', this.firstVolume(sortedPrices)],
      ['Maior volume', this.lastVolume(sortedPrices)],
      ['Gerado em', generatedAt]
    ]);

    this.drawSectionTitle(doc, 'Lista de precos', margin, 82);

    autoTable(doc, {
      startY: 88,
      margin: {left: margin, right: margin, bottom: 20},
      head: [['Produto', 'Preco', 'Atualizado', 'Por']],
      body: sortedPrices.length
        ? sortedPrices.map(item => [
          item.label || '-',
          `${this.money(item.salePrice)} Mts`,
          this.formatDateTime(item.updatedAt),
          item.updatedByName || 'Sistema'
        ])
        : [['-', 'Sem precos registados', '-', '-']],
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
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
        0: {cellWidth: 72},
        1: {cellWidth: 34, halign: 'right'},
        2: {cellWidth: 38},
        3: {cellWidth: contentWidth - 144}
      },
      didDrawPage: () => this.drawFooter(doc, margin, pageWidth, pageHeight)
    });

    doc.save(this.documentFilename.build('LISTA_PRECOS', 'CATALOGO', 'GERAL'));
  }

  private drawHeader(doc: jsPDF, pageWidth: number, margin: number): void {
    doc.setFillColor(16, 33, 43);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setFillColor(14, 124, 114);
    doc.roundedRect(margin, 9, 18, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(COMPANY_PROFILE.initials, margin + 9, 21, {align: 'center'});
    doc.setFontSize(18);
    doc.text('LISTA DE PRECOS', 38, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Catalogo comercial centralizado', 38, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_PROFILE.tradeName, pageWidth - margin, 14, {align: 'right'});
    doc.setFont('helvetica', 'normal');
    doc.text(COMPANY_PDF_LINES[0], pageWidth - margin, 19, {align: 'right'});
    doc.text(COMPANY_PDF_LINES[1], pageWidth - margin, 24, {align: 'right'});
    doc.text(COMPANY_PDF_LINES[2], pageWidth - margin, 29, {align: 'right'});
    doc.text(COMPANY_PDF_LINES[4], pageWidth - margin, 34, {align: 'right'});
  }

  private drawInfoPanel(doc: jsPDF, x: number, y: number, width: number, rows: Array<[string, string]>): void {
    doc.setDrawColor(223, 234, 240);
    doc.setFillColor(248, 251, 253);
    doc.roundedRect(x, y, width, 24, 3, 3, 'FD');

    const columnWidth = width / rows.length;
    rows.forEach(([label, value], index) => {
      const itemX = x + 5 + index * columnWidth;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(99, 115, 129);
      doc.text(label.toUpperCase(), itemX, y + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(16, 33, 43);
      doc.text(doc.splitTextToSize(value || '-', columnWidth - 10), itemX, y + 15);
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

  private sortByVolumeAndProduct(a: ProductPrice, b: ProductPrice): number {
    const volumeDiff = this.volumeNumber(a) - this.volumeNumber(b);
    if (volumeDiff !== 0) return volumeDiff;
    return (a.label || '').localeCompare(b.label || '');
  }

  private volumeNumber(item: ProductPrice): number {
    const source = item.truckVolume || item.label || item.code || '';
    const match = source.match(/\d+/);
    return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
  }

  private firstVolume(prices: ProductPrice[]): string {
    return prices.length ? `${this.volumeNumber(prices[0])}m` : '-';
  }

  private lastVolume(prices: ProductPrice[]): string {
    return prices.length ? `${this.volumeNumber(prices[prices.length - 1])}m` : '-';
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
