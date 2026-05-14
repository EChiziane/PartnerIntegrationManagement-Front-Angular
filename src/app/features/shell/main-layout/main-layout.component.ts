import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {TranslationService} from '@core/services/translation.service';

interface User {
  id: string;
  name: string;
  password: string;
  email: string;
  status: 'CREATED' | 'ACTIVE' | 'INACTIVE';
  phone: string;
  login: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'USER';
  createdAt: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: false,
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {

  isCollapsed = false;

  username: string = 'Utilizador';
  userRole: string = 'Conta autenticada';
  currentUserId: string | null = null;

  constructor(
    private router: Router,
    public translationService: TranslationService
  ) {
  }

  ngOnInit(): void {
    const userJson = localStorage.getItem('user');
    if (!userJson) return;

    try {
      const user = JSON.parse(userJson) as Partial<User>;
      this.currentUserId = user.id ?? null;
      this.username = user.name ?? user.login ?? this.translationService.instant('layout.account.defaultUser');
      this.userRole = this.roleLabel(user.role);
    } catch {
      this.currentUserId = null;
      this.username = this.translationService.instant('layout.account.defaultUser');
      this.userRole = this.translationService.instant('layout.account.authenticated');
    }
  }

  profileRoute(): string[] {
    return this.currentUserId
      ? ['/app/user-detail', this.currentUserId]
      : ['/app/users'];
  }

  private roleLabel(role: User['role'] | undefined): string {
    if (role === 'ADMIN') {
      return this.translationService.instant('layout.roles.admin');
    }

    if (role === 'MANAGER') {
      return this.translationService.instant('layout.roles.manager');
    }

    return role
      ? this.translationService.instant('layout.roles.operator')
      : this.translationService.instant('layout.account.authenticated');
  }

  get currentLanguage(): string {
    return this.translationService.currentLanguage;
  }

  changeLanguage(language: string): void {
    this.translationService.use(language).subscribe(() => {
      const userJson = localStorage.getItem('user');

      if (!userJson) {
        this.username = this.translationService.instant('layout.account.defaultUser');
        this.userRole = this.translationService.instant('layout.account.authenticated');
        return;
      }

      try {
        const user = JSON.parse(userJson) as Partial<User>;
        this.userRole = this.roleLabel(user.role);
      } catch {
        this.userRole = this.translationService.instant('layout.account.authenticated');
      }
    });
  }

  get userInitials(): string {
    const names = this.username
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!names.length) {
      return 'U';
    }

    return names
      .slice(0, 2)
      .map(name => name.charAt(0).toUpperCase())
      .join('');
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/landing-page']);
  }
}
