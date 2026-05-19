import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {environment} from '@env/environments';
import {Truck} from '@shared/models/truck';

@Injectable({
  providedIn: 'root'
})
export class TruckService {
  private readonly baseURL = `${environment.baseURL}/trucks`;

  constructor(private http: HttpClient) {
  }

  public getTrucks(): Observable<Truck[]> {
    return this.http.get<Truck[]>(this.baseURL);
  }

  public getTruckById(id: string): Observable<Truck> {
    return this.http.get<Truck>(`${this.baseURL}/${id}`);
  }

  public getTruckByDriverId(driverId: string): Observable<Truck> {
    return this.http.get<Truck>(`${this.baseURL}/driver/${driverId}`);
  }

  public addTruck(truck: Partial<Truck>): Observable<Truck> {
    return this.http.post<Truck>(this.baseURL, truck).pipe(take(1));
  }

  public updateTruck(id: string, truck: Partial<Truck>): Observable<Truck> {
    return this.http.put<Truck>(`${this.baseURL}/${id}`, truck).pipe(take(1));
  }

  public deleteTruck(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseURL}/${id}`).pipe(take(1));
  }
}
