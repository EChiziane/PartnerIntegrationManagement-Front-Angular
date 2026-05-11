import {Injectable} from '@angular/core';
import {Observable, take} from 'rxjs';
import {User} from '@shared/models/user';
import {HttpClient} from '@angular/common/http';
import {environment} from '@env/environments';

@Injectable({
  providedIn: 'root'
})
export class UserService {


  private baseURL = environment.baseURL + '/auth';

  constructor(private http: HttpClient) {
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseURL}/users`).pipe(take(1));
  }

  addUser(user: any): Observable<User> {
    return this.http.post<User>(`${this.baseURL}/register`, user).pipe(take(1));
  }

  updateUser(id: string, user: any): Observable<User> {
    return this.http.put<User>(`${this.baseURL}/${id}`, user).pipe(take(1));
  }

  deleteUser(id: string): Observable<User> {
    return this.http.delete<User>(`${this.baseURL}/${id}`).pipe(take(1));
  }
}
