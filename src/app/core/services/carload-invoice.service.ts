import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {environment} from '@env/environments';
import {CarloadInvoice} from '@shared/models/carload-invoice';
import {CarLoad} from '@shared/models/carload';

@Injectable({
  providedIn: 'root'
})
export class CarloadInvoiceService {
  private readonly baseURL = `${environment.baseURL}/faturas`;

  constructor(private http: HttpClient) {
  }

  getInvoices(): Observable<CarloadInvoice[]> {
    return this.http.get<CarloadInvoice[]>(this.baseURL);
  }

  addInvoice(invoice: any): Observable<CarloadInvoice> {
    return this.http.post<CarloadInvoice>(this.baseURL, invoice).pipe(take(1));
  }

  getBillableCarloads(customerId: string): Observable<CarLoad[]> {
    return this.http.get<CarLoad[]>(`${this.baseURL}/billable-carloads`, {params: {customerId}});
  }

  deleteInvoice(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseURL}/${id}`).pipe(take(1));
  }

}
