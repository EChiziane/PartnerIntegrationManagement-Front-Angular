import {Injectable} from '@angular/core';
import {environment} from '../../environments/environments';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {Customer} from '../models/WSM/customer';


@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  private baseURL = environment.baseURL + "/customers";

  constructor(private http: HttpClient) {
  }

  public getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.baseURL)
  }

  public deleteCustomer(id: any): Observable<Customer> {
    return this.http.delete<Customer>(`${this.baseURL}/${id}`)
  }

  public addCustomer(customer: any): Observable<Customer> {
    return this.http.post<Customer>(this.baseURL, customer).pipe(take(1))
  }

  public getCustomerById(id: any): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseURL}/${id}`);
  }

  public updateCustomer(id: any, customer: any): Observable<Customer> {
    return this.http.put<Customer>(`${this.baseURL}/${id}`, customer).pipe(take(1))
  }


}
