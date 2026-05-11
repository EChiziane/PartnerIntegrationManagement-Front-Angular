import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {environment} from '@env/environments';
import {Sprint} from '@shared/models/sprint';

@Injectable({
  providedIn: 'root'
})
export class SprintService {

  private baseURL = environment.baseURL + '/sprints';

  constructor(private http: HttpClient) {
  }

  getSprints(): Observable<Sprint[]> {
    return this.http.get<Sprint[]>(this.baseURL);
  }

  getSprintById(id: any): Observable<Sprint> {
    return this.http.get<Sprint>(`${this.baseURL}/${id}`);
  }

  addSprint(sprint: any): Observable<Sprint> {
    return this.http.post<Sprint>(this.baseURL, sprint).pipe(take(1));
  }

  updateSprint(id: any, sprint: any): Observable<Sprint> {
    return this.http.put<Sprint>(`${this.baseURL}/${id}`, sprint).pipe(take(1));
  }

  deleteSprint(id: any): Observable<Sprint> {
    return this.http.delete<Sprint>(`${this.baseURL}/${id}`);
  }
}
