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
  role: 'ADMIN' | 'USER';
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

  constructor(private router: Router) {
  }

  ngOnInit(): void {
    const userJson = localStorage.getItem('user');
    if (!userJson) return;

    try {
      const user = JSON.parse(userJson) as Partial<User>;
      this.username = user.name ?? user.login ?? 'Utilizador';
    } catch {
      this.username = 'Utilizador';
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/landing-page']);
  }
}
