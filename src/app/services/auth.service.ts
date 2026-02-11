import { Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
import { HttpClient } from '@angular/common/http';
import { Observable, take, tap } from 'rxjs';
import { User } from "../models/user";

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private baseURL = environment.baseURL + "/auth";

  constructor(private http: HttpClient) {}

  login(login: string, password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.baseURL}/login`, { login, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', login);
      })
    );
  }

  signup(user: any): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.baseURL}/register`, user);
  }

  // ===== Recovery (WhatsApp + Email OTP) =====

  requestPasswordReset(phoneWhatsApp: string): Observable<{ maskedName: string; maskedEmail: string; maskedPhone: string }> {
    return this.http.post<{ maskedName: string; maskedEmail: string; maskedPhone: string }>(
      `${this.baseURL}/password/reset/request`,
      { phoneWhatsApp }
    ).pipe(take(1));
  }

  confirmPasswordReset(phoneWhatsApp: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${this.baseURL}/password/reset/confirm`,
      { phoneWhatsApp }
    ).pipe(take(1));
  }

  resetPassword(phoneWhatsApp: string, otpCode: string, newPassword: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${this.baseURL}/password/reset`,
      { phoneWhatsApp, otpCode, newPassword }
    ).pipe(take(1));
  }


  public deleteUser(id: string): Observable<User> {
    return this.http.delete<User>(`${this.baseURL}/${id}`).pipe(take(1));
  }

  // ===== Other =====
  public getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseURL}/users`);
  }

  logout() {
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
