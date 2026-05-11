import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, switchMap, take, tap} from 'rxjs';

import {environment} from '@env/environments';
import {User} from '@shared/models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseURL = environment.baseURL + '/auth';

  constructor(private http: HttpClient) {
  }

  login(login: string, password: string): Observable<User> {
    return this.http.post<{ token: string }>(`${this.baseURL}/login`, {login, password}).pipe(
      tap(res => localStorage.setItem('token', res.token)),
      switchMap(() => this.getCurrentUser().pipe(take(1))),
      tap(user => this.storeSafeUser(user))
    );
  }

  signup(user: any): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.baseURL}/register`, user);
  }

  requestPasswordReset(phoneWhatsApp: string): Observable<{
    maskedName: string;
    maskedEmail: string;
    maskedPhone: string
  }> {
    return this.http.post<{ maskedName: string; maskedEmail: string; maskedPhone: string }>(
      `${this.baseURL}/password/reset/request`,
      {phoneWhatsApp}
    ).pipe(take(1));
  }

  confirmPasswordReset(phoneWhatsApp: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.baseURL}/password/reset/confirm`, {phoneWhatsApp}).pipe(take(1));
  }

  resetPassword(phoneWhatsApp: string, otpCode: string, newPassword: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${this.baseURL}/password/reset`,
      {phoneWhatsApp, otpCode, newPassword}
    ).pipe(take(1));
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseURL}/me`);
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseURL}/users`);
  }

  deleteUser(id: string): Observable<User> {
    return this.http.delete<User>(`${this.baseURL}/${id}`).pipe(take(1));
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private storeSafeUser(user: User): void {
    const safeUser: Partial<User> = {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      phone: user.phone,
      login: user.login,
      role: user.role,
      createdAt: user.createdAt
    };

    localStorage.setItem('user', JSON.stringify(safeUser));
  }
}
