import { Injectable } from '@angular/core';
import {Observable, take} from 'rxjs';
import {CarloadInvoice} from '../models/CarloadInvoice';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class CarloadInvoiceService {
  private baseURL = `${environment.baseURL}/carload-invoices`;

  constructor(private http: HttpClient) {
  }

  getInvoices(): Observable<CarloadInvoice[]> {
    return this.http.get<CarloadInvoice[]>(this.baseURL);
  }

  getInvoiceById(id: string): Observable<CarloadInvoice> {
    return this.http.get<CarloadInvoice>(`${this.baseURL}/${id}`);
  }

  addInvoice(invoice: CarloadInvoice): Observable<CarloadInvoice> {
    console.log(invoice);
    return this.http.post<CarloadInvoice>(this.baseURL, invoice).pipe(take(1));
  }

  updateInvoice(id: string, invoice: CarloadInvoice): Observable<CarloadInvoice> {
    return this.http.put<CarloadInvoice>(`${this.baseURL}/${id}`, invoice).pipe(take(1));
  }

  deleteInvoice(id: string): Observable<CarloadInvoice> {
    return this.http.delete<CarloadInvoice>(`${this.baseURL}/${id}`);
  }

  public getDownloadUrl(id: string): Observable<CarloadInvoice> {
    return this.http.get<CarloadInvoice>(`${this.baseURL}/download/${id}`);
  }

  downloadRecibo(id: string) {
    return this.http.get(`${this.baseURL}/download/${id}`, {
      responseType: 'blob' // 👈 Isto diz ao Angular que é um ficheiro, não JSON
    });
  }

}
