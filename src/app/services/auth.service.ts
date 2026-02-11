import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environments';
import {map, Observable, switchMap, take, tap} from 'rxjs';
import {User} from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private baseURL = environment.baseURL + '/auth';

  constructor(private http: HttpClient) {
  }

  // ✅ login: guarda token -> busca users -> encontra o user pelo login -> guarda user completo
  login(login: string, password: string): Observable<User> {
    return this.http.post<{ token: string }>(`${this.baseURL}/login`, {login, password}).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
      }),
      switchMap(() => this.getUsers().pipe(take(1))),
      map((users: User[]) => {
        const found = users.find(u => u.login?.toLowerCase() === login.toLowerCase());
        if (!found) {
          throw new Error(`Utilizador não encontrado na lista /auth/users para o login: ${login}`);
        }
        return found;
      }),
      tap((user: User) => {
        // ⚠️ nunca guardes password. Aqui garantimos que não vai
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
      })
    );
  }

  signup(user: any): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.baseURL}/register`, user);
  }

  // ===== Recovery (WhatsApp + Email OTP) =====
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

  // ===== Users =====
  public getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseURL}/users`);
  }

  public deleteUser(id: string): Observable<User> {
    return this.http.delete<User>(`${this.baseURL}/${id}`).pipe(take(1));
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
