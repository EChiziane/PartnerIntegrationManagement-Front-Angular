import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';

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
  styleUrls: ['./main-layout.component.scss'] // ⚠️ era styleUrl
})
export class MainLayoutComponent implements OnInit {

  isCollapsed = false;

  username: string = 'Utilizador';
  userRole: string = 'Conta autenticada';
  currentUserId: string | null = null;

  constructor(private router: Router) {
  }

  ngOnInit(): void {
    const userJson = localStorage.getItem('user');
    if (!userJson) return;

    try {
      const user = JSON.parse(userJson) as Partial<User>;
      this.currentUserId = user.id ?? null;
      this.username = user.name ?? user.login ?? 'Utilizador';
      this.userRole = this.roleLabel(user.role);
    } catch {
      this.currentUserId = null;
      this.username = 'Utilizador';
      this.userRole = 'Conta autenticada';
    }
  }

  profileRoute(): string[] {
    return this.currentUserId
      ? ['/app/user-detail', this.currentUserId]
      : ['/app/users'];
  }

  private roleLabel(role: User['role'] | undefined): string {
    if (role === 'ADMIN') {
      return 'Administrador';
    }

    if (role === 'MANAGER') {
      return 'Gestor';
    }

    return role ? 'Operador' : 'Conta autenticada';
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
