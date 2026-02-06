import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {environment} from '../../environments/environments';
import {Manager} from '../models/CSM/manager';


@Injectable({
  providedIn: 'root'
})
export class ManagerService {
  private baseURL = environment.baseURL + '/managers';

  constructor(private http: HttpClient) {
  }

  public getManagers(): Observable<Manager[]> {
    return this.http.get<Manager[]>(this.baseURL);
  }

  public deleteManager(id: any): Observable<Manager> {
    return this.http.delete<Manager>(`${this.baseURL}/${id}`);
  }

  public addManager(manager: any): Observable<Manager> {
    return this.http.post<Manager>(this.baseURL, manager).pipe(take(1));
  }

  public getManagerById(id: any): Observable<Manager> {
    return this.http.get<Manager>(`${this.baseURL}/${id}`);
  }

  public updateManager(id: any, manager: any): Observable<Manager> {
    return this.http.put<Manager>(`${this.baseURL}/${id}`, manager).pipe(take(1));
  }
}
