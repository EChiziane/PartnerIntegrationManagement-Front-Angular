import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of, switchMap, take, tap} from 'rxjs';

import {environment} from '@env/environment';
import {User} from '@shared/models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseURL = environment.baseURL + '/auth';

  constructor(private http: HttpClient) {
  }

  login(login: string, password: string): Observable<User> {
    if (environment.useLocalBackend && login && password) {
      const user = this.localDemoUser(login);
      localStorage.setItem('token', 'partner-integration-demo-token');
      this.storeSafeUser(user);
      return of(user);
    }

    return this.http.post<{ token: string }>(`${this.baseURL}/login`, {login, password}).pipe(
      tap(res => localStorage.setItem('token', res.token)),
      switchMap(() => this.getCurrentUser().pipe(take(1))),
      tap(user => this.storeSafeUser(user))
    );
  }

  signup(user: any): Observable<{ token: string }> {
    if (environment.useLocalBackend) {
      const localUser = this.localDemoUser(user?.login || user?.email || 'local.user');
      this.storeSafeUser({
        ...localUser,
        ...user,
        id: localUser.id,
        status: 'ACTIVE',
        role: user?.role || localUser.role,
        createdAt: localUser.createdAt
      });
      localStorage.setItem('token', 'partner-integration-demo-token');
      return of({token: 'partner-integration-demo-token'});
    }

    return this.http.post<{ token: string }>(`${this.baseURL}/register`, user);
  }

  requestPasswordReset(phoneWhatsApp: string): Observable<{
    maskedName: string;
    maskedEmail: string;
    maskedPhone: string
  }> {
    if (environment.useLocalBackend) {
      return of({
        maskedName: 'Integration Operations',
        maskedEmail: 'in********@example.com',
        maskedPhone: this.maskPhone(phoneWhatsApp)
      });
    }

    return this.http.post<{ maskedName: string; maskedEmail: string; maskedPhone: string }>(
      `${this.baseURL}/password/reset/request`,
      {phoneWhatsApp}
    ).pipe(take(1));
  }

  confirmPasswordReset(phoneWhatsApp: string): Observable<{ ok: boolean }> {
    if (environment.useLocalBackend) {
      return of({ok: !!phoneWhatsApp});
    }

    return this.http.post<{ ok: boolean }>(`${this.baseURL}/password/reset/confirm`, {phoneWhatsApp}).pipe(take(1));
  }

  resetPassword(phoneWhatsApp: string, otpCode: string, newPassword: string): Observable<{ ok: boolean }> {
    if (environment.useLocalBackend) {
      return of({ok: !!phoneWhatsApp && !!otpCode && !!newPassword});
    }

    return this.http.post<{ ok: boolean }>(
      `${this.baseURL}/password/reset`,
      {phoneWhatsApp, otpCode, newPassword}
    ).pipe(take(1));
  }

  getCurrentUser(): Observable<User> {
    const raw = localStorage.getItem('user');
    if (raw) {
      return of(JSON.parse(raw) as User);
    }

    return environment.useLocalBackend
      ? of(this.localDemoUser('local.user'))
      : this.http.get<User>(`${this.baseURL}/me`);
  }

  getUsers(): Observable<User[]> {
    if (environment.useLocalBackend) {
      const raw = localStorage.getItem('user');
      return of(raw ? [JSON.parse(raw) as User] : [this.localDemoUser('local.user')]);
    }

    return this.http.get<User[]>(`${this.baseURL}/users`);
  }

  deleteUser(id: string): Observable<User> {
    if (environment.useLocalBackend) {
      const user = this.localDemoUser('local.user');
      return of({...user, id, status: 'INACTIVE'});
    }

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

  private localDemoUser(login: string): User {
    return {
      id: 'demo-user',
      name: 'Integration Operations',
      email: 'integration.ops@example.com',
      status: 'ACTIVE',
      phone: '+258840000000',
      login,
      role: 'ADMIN',
      createdAt: new Date().toISOString()
    } as User;
  }

  private maskPhone(phone: string): string {
    const value = (phone || '').trim();
    if (value.length <= 4) return value || '+258*********';
    return `${value.slice(0, 4)}*****${value.slice(-2)}`;
  }
}
