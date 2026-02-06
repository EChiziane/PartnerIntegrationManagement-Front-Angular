import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {environment} from '../../environments/environments';
import {CarLoad} from '../models/CSM/carlaod';


@Injectable({
  providedIn: 'root'
})
export class CarloadService {

  private baseURL = environment.baseURL + '/carloads';

  constructor(private http: HttpClient) {
  }

  getCarLoads(): Observable<CarLoad[]> {
    return this.http.get<CarLoad[]>(this.baseURL);
  }

  getCarLoadById(id: any): Observable<CarLoad> {
    return this.http.get<CarLoad>(`${this.baseURL}/${id}`);
  }

  addCarLoad(carload: any): Observable<CarLoad> {
    return this.http.post<CarLoad>(this.baseURL, carload).pipe(take(1));
  }

  updateCarLoad(id: any, carload: any): Observable<CarLoad> {
    return this.http.put<CarLoad>(`${this.baseURL}/${id}`, carload).pipe(take(1));
  }

  deleteCarLoad(id: any): Observable<CarLoad> {
    return this.http.delete<CarLoad>(`${this.baseURL}/${id}`);
  }


}
