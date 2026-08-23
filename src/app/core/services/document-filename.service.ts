import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DocumentFilenameService {

  build(type: string, code: string | null | undefined, scope: string | null | undefined, date: Date = new Date()): string {
    const documentType = this.fileSafe(type, 'DOCUMENTO');
    const documentCode = this.fileSafe(code, 'SEM_CODIGO');
    const documentScope = this.fileSafe(scope, 'GERAL');
    const documentDate = this.formatDate(date);

    return `PI_${documentType}_${documentCode}_${documentScope}_${documentDate}.pdf`;
  }

  private fileSafe(value: string | null | undefined, fallback: string): string {
    const normalizedValue = (value || fallback)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .toUpperCase();

    return normalizedValue || fallback;
  }

  private formatDate(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('');
  }
}
