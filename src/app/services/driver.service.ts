import {Injectable} from '@angular/core';
import {environment} from '../../environments/environments';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {Driver} from '../models/CSM/driver';

@Injectable({
  providedIn: 'root'
})
export class DriverService {

  private baseURL = environment.baseURL + "/drivers";

  constructor(private http: HttpClient) {
  }

  public getDrivers(): Observable<Driver[]> {
    return this.http.get<Driver[]>(this.baseURL);
  }

  public deleteDriver(id: any): Observable<Driver> {
    return this.http.delete<Driver>(`${this.baseURL}/${id}`);
  }

  public addDriver(driver: any): Observable<Driver> {
    return this.http.post<Driver>(this.baseURL, driver).pipe(take(1));
  }

  public getDriverById(id: any): Observable<Driver> {
    return this.http.get<Driver>(`${this.baseURL}/${id}`);
  }

  public updateDriver(id: any, driver: any): Observable<Driver> {
    return this.http.put<Driver>(`${this.baseURL}/${id}`, driver).pipe(take(1));
  }
}
