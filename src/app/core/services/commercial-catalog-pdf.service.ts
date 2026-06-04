import {Injectable} from '@angular/core';
import type jsPDF from 'jspdf';

import {CatalogMaterialView, CatalogProductionItem, CatalogView} from '@shared/models/commercial-catalog';
import {DocumentFilenameService} from '@core/services/document-filename.service';
import {COMPANY_PROFILE} from '@shared/data/company-profile';
import {TranslationService} from '@core/services/translation.service';

@Injectable({
  providedIn: 'root'
})
export class CommercialCatalogPdfService {
  private readonly imageCache = new Map<string, string>();
  private autoTable?: typeof import('jspdf-autotable').default;

  constructor(
    private documentFilename: DocumentFilenameService,
    private translationService: TranslationService
  ) {
  }

  async download(catalog: CatalogView): Promise<void> {
    const [{default: JsPDF}, {default: autoTable}] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    this.autoTable = autoTable;
    const doc = new JsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    await this.drawCover(doc, catalog, pageWidth, pageHeight, margin);
    await this.drawSalesPage(doc, catalog, pageWidth, pageHeight, margin);

    for (const material of catalog.materialViews) {
      await this.drawMaterialPage(doc, catalog, material, pageWidth, pageHeight, margin);
    }

    this.drawPriceAndOrderPage(doc, catalog, pageWidth, pageHeight, margin);
    await this.drawContactPage(doc, catalog, pageWidth, pageHeight, margin);

    this.drawFooters(doc, pageWidth, pageHeight, margin);
    doc.save(this.documentFilename.build('CATALOGO', catalog.vehicleModel, catalog.vehicleName));
  }

  private async drawCover(doc: jsPDF, catalog: CatalogView, pageWidth: number, pageHeight: number, margin: number): Promise<void> {
    await this.drawImageCover(doc, catalog.heroImageUrl, 0, 0, pageWidth, pageHeight, 'cover');
    this.overlay(doc, 0, 0, pageWidth, pageHeight, [16, 33, 43], .62);
    this.overlay(doc, pageWidth * .69, 0, pageWidth * .31, pageHeight, [247, 181, 0], .88);

    this.drawBrandHeader(doc, margin, true);
    this.drawTag(doc, this.t('commercialCatalog.sales.audienceTag'), margin, 112, [247, 181, 0], [16, 33, 43]);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(34);
    doc.text(doc.splitTextToSize(this.t('commercialCatalog.sales.coverTitle'), 128), margin, 137);
    doc.setFontSize(14);
    doc.text(doc.splitTextToSize(this.t('commercialCatalog.sales.coverSubtitle'), 118), margin, 178);
    this.drawValuePill(doc, `${catalog.volumeM3}m3`, this.t('commercialCatalog.metrics.capacity'), margin, 205, 46);
    this.drawValuePill(doc, `${catalog.wheelbarrows}`, this.t('commercialCatalog.metrics.wheelbarrows'), margin + 52, 205, 55);
    this.drawContactStrip(doc, pageWidth, pageHeight, margin);
  }

  private async drawSalesPage(doc: jsPDF, catalog: CatalogView, pageWidth: number, pageHeight: number, margin: number): Promise<void> {
    doc.addPage();
    this.drawPageBand(doc, pageWidth, 58);
    this.drawBrandHeader(doc, margin, true);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(23);
    doc.text(this.t('commercialCatalog.sales.promiseTitle'), margin, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(this.t('commercialCatalog.sales.promiseText'), pageWidth - margin * 2), margin, 49);

    await this.drawImageCover(doc, catalog.vehicleImageUrl, margin, 72, 112, 92);
    await this.drawImageCover(doc, catalog.wheelbarrowImageUrl, margin + 124, 72, pageWidth - margin * 2 - 124, 92);

    const cards: Array<[string, string]> = [
      [`${catalog.volumeM3}m3`, this.t('commercialCatalog.metrics.capacity')],
      [`${catalog.wheelbarrows}`, this.t('commercialCatalog.metrics.wheelbarrows')],
      [this.t('commercialCatalog.sales.fastDeliveryValue'), this.t('commercialCatalog.sales.fastDeliveryLabel')],
      [this.t('commercialCatalog.sales.targetValue'), this.t('commercialCatalog.sales.targetLabel')]
    ];
    this.drawStatsGrid(doc, cards, margin, 178, pageWidth - margin * 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(16, 33, 43);
    doc.text(this.t('commercialCatalog.sales.whyTitle'), margin, 252);
    this.drawCheck(doc, margin, 266, this.t('commercialCatalog.sales.why1'));
    this.drawCheck(doc, margin, 276, this.t('commercialCatalog.sales.why2'));
    this.drawCheck(doc, margin + 96, 266, this.t('commercialCatalog.sales.why3'));
    this.drawCheck(doc, margin + 96, 276, this.t('commercialCatalog.sales.why4'));
  }

  private async drawVehiclePage(doc: jsPDF, catalog: CatalogView, pageWidth: number, pageHeight: number, margin: number): Promise<void> {
    doc.addPage();
    this.drawPageTitle(doc, this.t('commercialCatalog.page.vehicleKicker'), this.catalogText(catalog, 'audience'), margin);
    await this.drawImageCover(doc, catalog.vehicleImageUrl, margin, 44, pageWidth - margin * 2, 92);

    const stats: Array<[string, string]> = [
      [this.t('commercialCatalog.metrics.capacity'), `${catalog.volumeM3}m3`],
      [this.t('commercialCatalog.metrics.wheelbarrows'), `${catalog.wheelbarrows}`],
      [this.t('commercialCatalog.metrics.focus'), '24m3'],
      [this.t('commercialCatalog.metrics.delivery'), this.t('commercialCatalog.metrics.unload')]
    ];

    this.drawStatsGrid(doc, stats, margin, 150, pageWidth - margin * 2);
    this.drawStatement(doc, this.catalogText(catalog, 'promise'), margin, 222, pageWidth - margin * 2);
  }

  private async drawProductionPage(doc: jsPDF, catalog: CatalogView, pageWidth: number, pageHeight: number, margin: number): Promise<void> {
    doc.addPage();
    this.drawPageTitle(doc, this.t('commercialCatalog.production.kicker'), this.t('commercialCatalog.production.title', {volume: catalog.volumeM3}), margin);
    await this.drawImageCover(doc, catalog.productionImageUrl, margin, 44, pageWidth - margin * 2, 78);

    this.autoTable?.(doc, {
      startY: 136,
      margin: {left: margin, right: margin},
      head: [['Produto', 'Medida', 'Regra de producao', 'Resultado']],
      body: catalog.production.map(item => [item.title, item.measure, item.ratio, item.output]),
      theme: 'grid',
      styles: {fontSize: 9, cellPadding: 3, textColor: [41, 55, 70]},
      headStyles: {fillColor: [16, 33, 43], textColor: [255, 255, 255]},
      alternateRowStyles: {fillColor: [248, 251, 253]}
    });

    this.drawStatement(doc, this.t('commercialCatalog.comparison.title'), margin, 226, pageWidth - margin * 2);
  }

  private async drawMaterialPage(
    doc: jsPDF,
    catalog: CatalogView,
    material: CatalogMaterialView,
    pageWidth: number,
    pageHeight: number,
    margin: number
  ): Promise<void> {
    doc.addPage();
    await this.drawImageCover(doc, material.imageUrl, 0, 0, pageWidth, 120, 'cover');
    this.overlay(doc, 0, 0, pageWidth, 120, [16, 33, 43], .34);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(25);
    doc.text(this.materialText(material, 'title'), margin, 94);
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(this.materialText(material, 'subtitle'), pageWidth - margin * 2), margin, 105);

    this.drawPriceBox(doc, this.commercialCatalogPrice(material), margin, 135, 70);
    this.drawValuePill(doc, `${catalog.volumeM3}m3`, this.t('commercialCatalog.metrics.capacity'), margin + 78, 136, 42);
    this.drawValuePill(doc, `${catalog.wheelbarrows}`, this.t('commercialCatalog.metrics.wheelbarrows'), margin + 126, 136, 52);

    this.drawStatement(doc, this.materialText(material, 'originNote'), margin, 174, pageWidth - margin * 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(16, 33, 43);
    doc.text(this.t('commercialCatalog.materialLabels.idealFor'), margin, 214);

    this.materialList(material, 'applications').forEach((item, index) => {
      this.drawCheck(doc, margin, 228 + index * 9, item);
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(16, 33, 43);
    doc.text(this.t('commercialCatalog.materialLabels.benefits'), margin + 96, 214);
    this.materialList(material, 'benefits').forEach((item, index) => {
      this.drawCheck(doc, margin + 96, 228 + index * 9, item);
    });

    this.drawCommercialCta(doc, pageWidth, pageHeight, margin);
  }

  private drawPriceAndOrderPage(doc: jsPDF, catalog: CatalogView, pageWidth: number, pageHeight: number, margin: number): void {
    doc.addPage();
    this.drawPageBand(doc, pageWidth, 48);
    this.drawBrandHeader(doc, margin, true);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(this.t('commercialCatalog.order.title'), margin, 36);

    this.autoTable?.(doc, {
      startY: 62,
      margin: {left: margin, right: margin},
      head: [[this.t('commercialCatalog.order.material'), this.t('commercialCatalog.order.quantity'), this.t('commercialCatalog.order.price')]],
      body: catalog.materialViews.map(material => [
        this.materialText(material, 'title'),
        `${catalog.volumeM3}m3 / ${catalog.wheelbarrows} ${this.t('commercialCatalog.metrics.wheelbarrowsLower')}`,
        this.commercialCatalogPrice(material)
      ]),
      theme: 'grid',
      styles: {fontSize: 11, cellPadding: 4, textColor: [41, 55, 70]},
      headStyles: {fillColor: [16, 33, 43], textColor: [255, 255, 255]},
      alternateRowStyles: {fillColor: [248, 251, 253]}
    });

    const y = 162;
    doc.setFillColor(255, 247, 225);
    doc.setDrawColor(247, 181, 0);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 72, 5, 5, 'FD');
    doc.setTextColor(16, 33, 43);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(this.t('commercialCatalog.order.howTitle'), margin + 8, y + 14);
    this.drawNumberedStep(doc, margin + 8, y + 30, '1', this.t('commercialCatalog.order.step1'));
    this.drawNumberedStep(doc, margin + 8, y + 46, '2', this.t('commercialCatalog.order.step2'));
    this.drawNumberedStep(doc, margin + 8, y + 62, '3', this.t('commercialCatalog.order.step3'));

    this.drawStatement(doc, this.t('commercialCatalog.order.salesLine'), margin, 248, pageWidth - margin * 2);
  }

  private drawBlockPage(doc: jsPDF, catalog: CatalogView, item: CatalogProductionItem, pageWidth: number, pageHeight: number, margin: number): void {
    doc.addPage();
    this.drawPageTitle(doc, item.title, this.t('commercialCatalog.production.reference'), margin);
    this.drawBlockVisual(doc, margin, 46, pageWidth - margin * 2, 76);

    const rows: Array<[string, string]> = [
      ['Medida', item.measure],
      ['Producao', item.ratio],
      ['Por carga', item.output],
      ['Volume base', `${catalog.volumeM3}m3`]
    ];
    this.drawInfoRows(doc, rows, margin, 140, pageWidth - margin * 2);
  }

  private drawComparisonPage(doc: jsPDF, catalog: CatalogView, pageWidth: number, pageHeight: number, margin: number): void {
    doc.addPage();
    this.drawPageTitle(doc, this.t('commercialCatalog.comparison.kicker'), this.t('commercialCatalog.comparison.title'), margin);

    this.autoTable?.(doc, {
      startY: 54,
      margin: {left: margin, right: margin},
      head: [['Item', 'Quantidade']],
      body: [
        [this.t('commercialCatalog.metrics.wheelbarrows'), String(catalog.wheelbarrows)],
        ['Blocos 15', '920'],
        ['Blocos 10', '1.104'],
        [this.t('commercialCatalog.comparison.noteLabel'), this.t('commercialCatalog.comparison.noteValue')]
      ],
      theme: 'grid',
      styles: {fontSize: 12, cellPadding: 5, textColor: [41, 55, 70]},
      headStyles: {fillColor: [14, 124, 114], textColor: [255, 255, 255]},
      alternateRowStyles: {fillColor: [248, 251, 253]}
    });

    this.drawStatement(doc, this.t('commercialCatalog.comparison.statement'), margin, 174, pageWidth - margin * 2);
  }

  private async drawContactPage(doc: jsPDF, catalog: CatalogView, pageWidth: number, pageHeight: number, margin: number): Promise<void> {
    doc.addPage();
    await this.drawImageCover(doc, catalog.contactImageUrl, 0, 0, pageWidth, pageHeight, 'cover');
    this.overlay(doc, 0, 0, pageWidth, pageHeight, [16, 33, 43], .76);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(25);
    doc.text(COMPANY_PROFILE.tradeName.toUpperCase(), margin, 154);
    doc.setFontSize(12);
    doc.text(this.t('commercialCatalog.contact.service'), margin, 166);
    doc.setFont('helvetica', 'normal');
    doc.text(`Telefone: ${COMPANY_PROFILE.phonePrimary}`, margin, 188);
    doc.text(`Email: ${COMPANY_PROFILE.email}`, margin, 198);
    doc.text(this.t('commercialCatalog.contact.location'), margin, 208);
    doc.text(this.t('commercialCatalog.contact.payment'), margin, 218);
    doc.text(`NUIT: ${COMPANY_PROFILE.nuit}`, margin, 228);
  }

  private drawBrandHeader(doc: jsPDF, margin: number, light = false): void {
    doc.setFillColor(247, 181, 0);
    doc.roundedRect(margin, 12, 18, 18, 3, 3, 'F');
    doc.setTextColor(16, 33, 43);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TC', margin + 9, 24, {align: 'center'});
    doc.setTextColor(light ? 255 : 16, light ? 255 : 33, light ? 255 : 43);
    doc.setFontSize(13);
    doc.text(COMPANY_PROFILE.tradeName, margin + 25, 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`NUIT: ${COMPANY_PROFILE.nuit}`, margin + 25, 28);
  }

  private drawPageTitle(doc: jsPDF, title: string, subtitle: string, margin: number): void {
    doc.setTextColor(16, 33, 43);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(title, margin, 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(99, 115, 129);
    doc.text(doc.splitTextToSize(subtitle, 160), margin, 32);
  }

  private drawPageBand(doc: jsPDF, pageWidth: number, height: number): void {
    doc.setFillColor(16, 33, 43);
    doc.rect(0, 0, pageWidth, height, 'F');
    doc.setFillColor(247, 181, 0);
    doc.triangle(pageWidth * .72, 0, pageWidth, 0, pageWidth, height, 'F');
  }

  private drawTag(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    fill: [number, number, number],
    textColor: [number, number, number]
  ): void {
    const width = Math.max(38, doc.getTextWidth(text) + 11);
    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.roundedRect(x, y, width, 10, 3, 3, 'F');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(text, x + width / 2, y + 6.7, {align: 'center'});
  }

  private drawValuePill(doc: jsPDF, value: string, label: string, x: number, y: number, width: number): void {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, 22, 4, 4, 'F');
    doc.setTextColor(16, 33, 43);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(value, x + 5, y + 9);
    doc.setTextColor(99, 115, 129);
    doc.setFontSize(6.8);
    doc.text(doc.splitTextToSize(label.toUpperCase(), width - 8), x + 5, y + 16);
  }

  private drawPriceBox(doc: jsPDF, price: string, x: number, y: number, width: number): void {
    doc.setFillColor(247, 181, 0);
    doc.roundedRect(x, y, width, 26, 5, 5, 'F');
    doc.setTextColor(16, 33, 43);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(21);
    doc.text(price, x + 6, y + 15);
    doc.setFontSize(7.5);
    doc.text(this.t('commercialCatalog.materialLabels.centralPrice').toUpperCase(), x + 6, y + 22);
  }

  private drawStatsGrid(doc: jsPDF, rows: Array<[string, string]>, x: number, y: number, width: number): void {
    const cardWidth = (width - 8) / 2;
    rows.forEach(([label, value], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const itemX = x + col * (cardWidth + 8);
      const itemY = y + row * 34;
      doc.setFillColor(248, 251, 253);
      doc.setDrawColor(223, 234, 240);
      doc.roundedRect(itemX, itemY, cardWidth, 26, 4, 4, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(99, 115, 129);
      doc.text(label.toUpperCase(), itemX + 6, itemY + 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(16, 33, 43);
      doc.text(value, itemX + 6, itemY + 20);
    });
  }

  private drawStatement(doc: jsPDF, text: string, x: number, y: number, width: number): void {
    doc.setFillColor(255, 247, 225);
    doc.setDrawColor(247, 181, 0);
    doc.roundedRect(x, y, width, 24, 4, 4, 'FD');
    doc.setTextColor(16, 33, 43);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(text, width - 12), x + 6, y + 10);
  }

  private drawBadge(doc: jsPDF, text: string, x: number, y: number): void {
    const width = Math.max(31, doc.getTextWidth(text) + 9);
    doc.setFillColor(14, 124, 114);
    doc.roundedRect(x, y, width, 10, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(text, x + width / 2, y + 6.7, {align: 'center'});
  }

  private drawCheck(doc: jsPDF, x: number, y: number, text: string): void {
    doc.setFillColor(14, 124, 114);
    doc.circle(x + 3, y - 2, 2.2, 'F');
    doc.setTextColor(41, 55, 70);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(text, x + 9, y);
  }

  private drawCommercialCta(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number): void {
    const y = pageHeight - 36;
    doc.setFillColor(16, 33, 43);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 4, 4, 'F');
    doc.setFillColor(247, 181, 0);
    doc.roundedRect(margin + 4, y + 4, 52, 12, 3, 3, 'F');
    doc.setTextColor(16, 33, 43);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(this.t('commercialCatalog.order.callNow'), margin + 30, y + 12, {align: 'center'});
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`${COMPANY_PROFILE.phonePrimary}  |  ${COMPANY_PROFILE.email}`, margin + 64, y + 12);
  }

  private drawNumberedStep(doc: jsPDF, x: number, y: number, number: string, text: string): void {
    doc.setFillColor(16, 33, 43);
    doc.circle(x + 4, y - 3, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(number, x + 4, y - .5, {align: 'center'});
    doc.setTextColor(16, 33, 43);
    doc.setFontSize(10);
    doc.text(text, x + 13, y);
  }

  private drawInfoRows(doc: jsPDF, rows: Array<[string, string]>, x: number, y: number, width: number): void {
    rows.forEach(([label, value], index) => {
      const itemY = y + index * 18;
      doc.setFillColor(index % 2 === 0 ? 248 : 255, 251, 253);
      doc.rect(x, itemY, width, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(16, 33, 43);
      doc.text(label, x + 5, itemY + 9);
      doc.setFont('helvetica', 'normal');
      doc.text(value, x + 54, itemY + 9);
    });
  }

  private drawBlockVisual(doc: jsPDF, x: number, y: number, width: number, height: number): void {
    doc.setFillColor(216, 222, 226);
    doc.roundedRect(x, y, width, height, 4, 4, 'F');
    doc.setDrawColor(174, 184, 191);
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 8; col++) {
        const offset = row % 2 === 0 ? 0 : 8;
        doc.roundedRect(x + 10 + col * 21 + offset, y + 10 + row * 10, 18, 7, 1, 1, 'S');
      }
    }
  }

  private drawContactStrip(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number): void {
    doc.setFillColor(247, 181, 0);
    doc.rect(0, pageHeight - 38, pageWidth, 38, 'F');
    doc.setTextColor(16, 33, 43);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(COMPANY_PROFILE.phonePrimary, margin, pageHeight - 22);
    doc.text(COMPANY_PROFILE.email, margin, pageHeight - 11);
  }

  private drawFooters(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number): void {
    const pages = doc.getNumberOfPages();
    for (let page = 2; page <= pages - 1; page++) {
      doc.setPage(page);
      doc.setDrawColor(223, 234, 240);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(99, 115, 129);
      doc.text(COMPANY_PROFILE.tradeName, margin, pageHeight - 8);
      doc.text(`Pagina ${page} de ${pages}`, pageWidth - margin, pageHeight - 8, {align: 'right'});
    }
  }

  private async drawImageCover(
    doc: jsPDF,
    url: string,
    x: number,
    y: number,
    width: number,
    height: number,
    mode: 'cover' | 'contain' = 'contain'
  ): Promise<void> {
    try {
      const dataUrl = await this.loadImageDataUrl(url);
      const props = doc.getImageProperties(dataUrl);
      const imageRatio = props.width / props.height;
      const boxRatio = width / height;
      const cover = mode === 'cover';
      const drawWidth = cover
        ? (imageRatio > boxRatio ? height * imageRatio : width)
        : (imageRatio > boxRatio ? width : height * imageRatio);
      const drawHeight = cover
        ? (imageRatio > boxRatio ? height : width / imageRatio)
        : (imageRatio > boxRatio ? width / imageRatio : height);
      const drawX = x - (drawWidth - width) / 2;
      const drawY = y - (drawHeight - height) / 2;
      doc.addImage(dataUrl, 'PNG', drawX, drawY, drawWidth, drawHeight);
      doc.setDrawColor(255, 255, 255);
      doc.rect(x, y, width, height, 'S');
    } catch {
      doc.setFillColor(238, 244, 247);
      doc.rect(x, y, width, height, 'F');
    }
  }

  private async loadImageDataUrl(url: string): Promise<string> {
    const cached = this.imageCache.get(url);
    if (cached) return cached;

    const response = await fetch(url);
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    this.imageCache.set(url, dataUrl);
    return dataUrl;
  }

  private overlay(doc: jsPDF, x: number, y: number, width: number, height: number, color: [number, number, number], opacity: number): void {
    doc.saveGraphicsState();
    doc.setGState(doc.GState({opacity}));
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x, y, width, height, 'F');
    doc.restoreGraphicsState();
  }

  private money(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'Sob consulta';
    return `MT ${Number(value).toLocaleString('pt-MZ', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }

  private commercialCatalogPrice(material: CatalogMaterialView): string {
    return this.money(material.price ?? material.fallbackPrice);
  }

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }

  private catalogText(catalog: CatalogView, field: string): string {
    const fallback = (catalog as any)[field];
    if (fallback) return fallback;
    const translated = this.translationService.instant(`${catalog.i18nKey}.${field}`);
    return translated === `${catalog.i18nKey}.${field}` ? fallback : translated;
  }

  private materialText(material: CatalogMaterialView, field: string): string {
    const fallback = (material as any)[field];
    if (fallback) return fallback;
    const translated = this.translationService.instant(`${material.i18nKey}.${field}`);
    return translated === `${material.i18nKey}.${field}` ? fallback : translated;
  }

  private materialList(material: CatalogMaterialView, field: 'applications' | 'benefits'): string[] {
    if (material[field]?.length) return material[field];
    const value = this.translationService.instant(`${material.i18nKey}.${field}`);
    return value.includes('|') ? value.split('|') : material[field];
  }
}
