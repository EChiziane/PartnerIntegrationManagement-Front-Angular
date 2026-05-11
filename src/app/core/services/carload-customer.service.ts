import {Injectable} from '@angular/core';
import {environment} from '@env/environments';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {CarloadCustomer} from '@shared/models/carload-customer';

@Injectable({
  providedIn: 'root'
})
export class CarloadCustomerService {
  private readonly baseURL = `${environment.baseURL}/carload-customers`;

  constructor(private http: HttpClient) {
  }

  getCustomers(): Observable<CarloadCustomer[]> {
    return this.http.get<CarloadCustomer[]>(this.baseURL);
  }

  getCustomerById(id: string): Observable<CarloadCustomer> {
    return this.http.get<CarloadCustomer>(`${this.baseURL}/${id}`);
  }

  addCustomer(customer: Partial<CarloadCustomer>): Observable<CarloadCustomer> {
    return this.http.post<CarloadCustomer>(this.baseURL, customer).pipe(take(1));
  }

  updateCustomer(id: string, customer: Partial<CarloadCustomer>): Observable<CarloadCustomer> {
    return this.http.put<CarloadCustomer>(`${this.baseURL}/${id}`, customer).pipe(take(1));
  }

  deleteCustomer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseURL}/${id}`).pipe(take(1));
  }
}
