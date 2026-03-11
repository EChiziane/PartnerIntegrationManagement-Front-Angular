import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {environment} from '../../environments/environments';
import {CarLoad} from '../models/CSM/carlaod';

@Injectable({
  providedIn: 'root'
})
export class CarloadService {
  private readonly baseURL = `${environment.baseURL}/carloads`;

  constructor(private http: HttpClient) {
  }

  getCarLoads(): Observable<CarLoad[]> {
    return this.http.get<CarLoad[]>(this.baseURL);
  }

  getCarLoadById(id: string): Observable<CarLoad> {
    return this.http.get<CarLoad>(`${this.baseURL}/${id}`);
  }

  getCarloadsBySprint(id: string): Observable<CarLoad[]> {
    return this.http.get<CarLoad[]>(`${this.baseURL}/sprint/${id}`);
  }

  addCarLoad(carload: Partial<CarLoad> & any): Observable<CarLoad> {
    return this.http.post<CarLoad>(this.baseURL, carload).pipe(take(1));
  }

  updateCarLoad(id: string, carload: Partial<CarLoad> & any): Observable<CarLoad> {
    return this.http.put<CarLoad>(`${this.baseURL}/${id}`, carload).pipe(take(1));
  }

  deleteCarLoad(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseURL}/${id}`).pipe(take(1));
  }
}
