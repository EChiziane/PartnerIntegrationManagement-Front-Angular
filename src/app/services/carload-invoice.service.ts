import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, take } from 'rxjs';
import { environment } from '../../environments/environments';
import { CarloadInvoice } from '../models/CarloadInvoice';

@Injectable({
  providedIn: 'root'
})
export class CarloadInvoiceService {
  private readonly baseURL = `${environment.baseURL}/carload-invoices`;

  constructor(private http: HttpClient) {}

  getInvoices(): Observable<CarloadInvoice[]> {
    return this.http.get<CarloadInvoice[]>(this.baseURL);
  }

  addInvoice(invoice: any): Observable<CarloadInvoice> {
    return this.http.post<CarloadInvoice>(this.baseURL, invoice).pipe(take(1));
  }

  deleteInvoice(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseURL}/${id}`).pipe(take(1));
  }

  downloadInvoice(id: string): Observable<Blob> {
    return this.http.get(`${this.baseURL}/download/${id}`, {
      responseType: 'blob'
    }).pipe(take(1));
  }
}
