import {Injectable} from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {CarloadCustomer} from '@shared/models/carload-customer';
import {CarLoad} from '@shared/models/carload';

@Injectable({
  providedIn: 'root'
})
export class CarloadCustomerDetailPdfService {

  downloadCustomerReport(customer: CarloadCustomer, carloads: CarLoad[]): void {
    const doc = new jsPDF({orientation: 'landscape'});
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const issueDate = this.formatDate(new Date());
    const totalEarnings = carloads.reduce((sum, item) => sum + Number(item.totalEarnings || 0), 0);
    const totalSpent = carloads.reduce((sum, item) => sum + Number(item.totalSpent || 0), 0);
    const marginValue = totalEarnings - totalSpent;

    this.drawHeader(doc, 'Ficha do cliente', `Emitido em ${issueDate}`);
    this.drawMetricCard(doc, margin, 52, 78, 'Carradas', String(carloads.length));
    this.drawMetricCard(doc, margin + 88, 52, 78, 'Receita total', `${this.money(totalEarnings)} Mts`);
    this.drawMetricCard(doc, margin + 176, 52, 78, 'Margem estimada', `${this.money(marginValue)} Mts`);

    this.drawSectionTitle(doc, 'Dados do cliente', margin, 92);
    this.drawInfoPanel(doc, margin, 98, contentWidth, [
      ['Codigo', customer.customerCode || '-'],
      ['Nome', customer.name || '-'],
      ['NUIT', customer.nuitNumber || '-'],
      ['Telefone', customer.phoneNumber || '-'],
      ['Email', customer.emailAddress || '-'],
      ['Morada', this.fullAddress(customer)],
      ['Cliente desde', this.formatDate(customer.createdAt)],
      ['Registado por', customer.createdByName || 'Sistema']
    ]);

    this.drawCarloadsTable(doc, carloads, margin, 154);
    this.drawFooter(doc);
    doc.save(`CLIENTE_${this.fileSafe(customer.customerCode || customer.name || customer.id)}.pdf`);
  }

  private drawCarloadsTable(doc: jsPDF, carloads: CarLoad[], margin: number, startY: number): void {
    this.drawSectionTitle(doc, 'Carradas do cliente', margin, startY - 6);

    const body = carloads.length
      ? carloads.map(carload => [
        carload.customerName || '-',
        carload.transportedMaterial || '-',
        carload.deliveryDestination || '-',
        carload.assignedDriverName || '-',
        this.statusLabel(carload.deliveryStatus),
        this.formatDate(carload.deliveryScheduledDate),
        `${this.money(carload.totalEarnings)} Mts`,
        carload.createdByName || 'Sistema'
      ])
      : [['-', 'Sem carradas registadas', '-', '-', '-', '-', '-', '-']];

    autoTable(doc, {
      startY,
      margin: {left: margin, right: margin},
      head: [[
        'Cliente',
        'Material',
        'Destino',
        'Motorista',
        'Estado',
        'Agendada',
        'Receita',
        'Criado por'
      ]],
      body,
      styles: {
        cellPadding: 3,
        font: 'helvetica',
        fontSize: 8,
        lineColor: [224, 231, 239],
        lineWidth: 0.2,
        overflow: 'linebreak',
        textColor: [41, 55, 70],
        valign: 'middle'
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
        6: {halign: 'right'}
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
    doc.text('Transportes Chiziane', 14, 16);

    doc.setFontSize(10);
    doc.setTextColor(228, 173, 84);
    doc.text(title, 14, 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(219, 231, 236);
    doc.text('Fornecimento e transporte de materiais de construcao', 14, 34);
    doc.text('Documento gerado automaticamente pelo sistema', 14, 39);

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
      doc.text('Documento emitido automaticamente pelo sistema Transportes Chiziane', 14, pageHeight - 10);
      doc.text(`Pagina ${page} de ${pageCount}`, pageWidth - 14, pageHeight - 10, {align: 'right'});
    }
  }

  private fullAddress(customer: CarloadCustomer): string {
    const parts = [customer.streetAddress, customer.city, customer.zipCode].filter(Boolean);
    return parts.length ? parts.join(', ') : '-';
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

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  private fileSafe(value: string): string {
    return value.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'cliente';
  }
}
