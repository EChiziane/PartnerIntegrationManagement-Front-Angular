import { Injectable } from '@angular/core';
import {environment} from '../../environments/environments';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {CarloadCustomer} from '../models/CarloadCustomer';

@Injectable({
  providedIn: 'root'
})
export class CarloadCustomerService {

  private baseURL = environment.baseURL + "/carload-customers";

  constructor(private http: HttpClient) {
  }

  public getCustomers(): Observable<CarloadCustomer[]> {
    return this.http.get<CarloadCustomer[]>(this.baseURL);
  }

  public getCustomerById(id: string): Observable<CarloadCustomer> {
    return this.http.get<CarloadCustomer>(`${this.baseURL}/${id}`);
  }

  public addCustomer(customer: CarloadCustomer): Observable<CarloadCustomer> {
    return this.http.post<CarloadCustomer>(this.baseURL, customer).pipe(take(1));
  }

  public updateCustomer(id: string, customer: CarloadCustomer): Observable<CarloadCustomer> {
    return this.http.put<CarloadCustomer>(`${this.baseURL}/${id}`, customer).pipe(take(1));
  }

  public deleteCustomer(id: string): Observable<CarloadCustomer> {
    return this.http.delete<CarloadCustomer>(`${this.baseURL}/${id}`);
  }
}
