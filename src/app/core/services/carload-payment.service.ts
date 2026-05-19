import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {environment} from '@env/environments';
import {CarloadPayment} from '@shared/models/carload-payment';

@Injectable({
  providedIn: 'root'
})
export class CarloadPaymentService {
  private readonly baseURL = `${environment.baseURL}/payments`;

  constructor(private http: HttpClient) {
  }

  public getPayments(): Observable<CarloadPayment[]> {
    return this.http.get<CarloadPayment[]>(this.baseURL);
  }

  public getPaymentById(id: string): Observable<CarloadPayment> {
    return this.http.get<CarloadPayment>(`${this.baseURL}/${id}`);
  }

  public getPaymentsByCarLoad(carLoadId: string): Observable<CarloadPayment[]> {
    return this.http.get<CarloadPayment[]>(`${this.baseURL}/carload/${carLoadId}`);
  }

  public getPaymentsByInvoice(invoiceId: string): Observable<CarloadPayment[]> {
    return this.http.get<CarloadPayment[]>(`${this.baseURL}/invoice/${invoiceId}`);
  }

  public addPayment(payment: Partial<CarloadPayment>): Observable<CarloadPayment> {
    return this.http.post<CarloadPayment>(this.baseURL, payment).pipe(take(1));
  }

  public updatePayment(id: string, payment: Partial<CarloadPayment>): Observable<CarloadPayment> {
    return this.http.put<CarloadPayment>(`${this.baseURL}/${id}`, payment).pipe(take(1));
  }

  public deletePayment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseURL}/${id}`).pipe(take(1));
  }
}
