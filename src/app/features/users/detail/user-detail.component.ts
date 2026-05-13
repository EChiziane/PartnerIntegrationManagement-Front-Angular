import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {NzMessageService} from 'ng-zorro-antd/message';
import {User} from '@shared/models/user';
import {UserService} from '@core/services/user.service';
import {TranslationService} from '@core/services/translation.service';

@Component({
  selector: 'app-user-detail',
  standalone: false,
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit {
  user: User | null = null;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private message: NzMessageService,
    private translationService: TranslationService
  ) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');

      if (!id) {
        this.message.error(this.t('users.messages.missing'));
        this.goBack();
        return;
      }

      this.loadUser(id);
    });
  }

  get initials(): string {
    const value = this.user?.name || this.user?.login || 'U';
    return value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'U';
  }

  roleLabel(role: User['role'] | undefined): string {
    const labels: Record<User['role'], string> = {
      ADMIN: this.t('layout.roles.admin'),
      MANAGER: this.t('layout.roles.manager'),
      OPERATOR: this.t('layout.roles.operator'),
      USER: this.t('layout.roles.operator')
    };

    return role ? labels[role] : this.t('users.fields.function');
  }

  roleColor(role: User['role'] | undefined): string {
    if (role === 'ADMIN') return 'red';
    if (role === 'MANAGER') return 'blue';
    return 'green';
  }

  statusLabel(status: User['status'] | undefined): string {
    if (status === 'ACTIVE') return this.t('users.status.active');
    if (status === 'INACTIVE') return this.t('users.status.inactive');
    return this.t('users.status.created');
  }

  statusColor(status: User['status'] | undefined): string {
    if (status === 'ACTIVE') return 'green';
    if (status === 'INACTIVE') return 'red';
    return 'orange';
  }

  goBack(): void {
    window.history.back();
  }

  goToUsers(): void {
    this.router.navigate(['/app/users']);
  }

  private loadUser(id: string): void {
    this.isLoading = true;

    this.userService.getUsers().subscribe({
      next: users => {
        this.user = (users || []).find(item => item.id === id) || null;
        this.isLoading = false;

        if (!this.user) {
          this.message.warning(this.t('users.messages.notFound'));
        }
      },
      error: () => {
        this.isLoading = false;
        this.message.error(this.t('users.messages.loadError'));
      }
    });
  }

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }
}
