import {Injectable} from '@angular/core';
import {environment} from '../../environments/environments';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {Payment} from '../models/WSM/payment';
import {Recibo} from '../models/WSM/Recibo';

@Injectable({
  providedIn: 'root'
})
export class CustomerPaymentInvoiceService {

  private baseURL = environment.baseURL + "/customer_payments_invoice";

  constructor(private http: HttpClient) {
  }

  public createCustomerPaymentInvoice(payment: any): Observable<Payment> {
    return this.http.post<Payment>(`${this.baseURL}/${payment}`, payment).pipe(take(1));
  }

  public downloadRecibo(id: string) {
    return this.http.get(`${this.baseURL}/download/${id}`, {
      responseType: 'blob' // 👈 Isto diz ao Angular que é um ficheiro, não JSON
    });
  }

  public getCustomerPaymentInvoice(): Observable<Recibo[]> {
    return this.http.get<Recibo[]>(this.baseURL);
  }


}
