import {Component} from '@angular/core';
import {User} from '@shared/models/user';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {NzMessageService} from 'ng-zorro-antd/message';
import {UserService} from '@core/services/user.service';
import {TranslationService} from '@core/services/translation.service';
import {ConfirmationDialogService} from '@core/services/confirmation-dialog.service';

@Component({
  selector: 'app-listuser',
  standalone: false,
  templateUrl: './listuser.component.html',
  styleUrl: './listuser.component.scss'
})
export class ListuserComponent {
  dataSource: User[] = [];
  listOfDisplayData: User[] = [];

  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';

  totalUsers = 0;
  activeUsers = 0;
  inactiveUsers = 0;

  searchValue = '';
  visible = false;
  visible1 = false;
  userForm!: FormGroup;
  currentEditingUserId: string | null = null;
  isUserDrawerVisible = false;
  isSaving = false;

  constructor(
    private http: HttpClient,
    private message: NzMessageService,
    private userService: UserService,
    private confirmationDialog: ConfirmationDialogService,
    private fb: FormBuilder,
    private translationService: TranslationService
  ) {
    this.initForms();
  }

  get userDrawerTitle(): string {
    return this.currentEditingUserId ? this.t('users.edit') : this.t('users.register');
  }

  onBack() {
    window.history.back();
  }

  loadUsers() {
    this.userService.getUsers().subscribe(users => {
      this.dataSource = users;
      this.listOfDisplayData = [...users];

      this.totalUsers = users.length;
      this.activeUsers = users.filter(u => u.status === 'ACTIVE').length;
      this.inactiveUsers = users.filter(u => u.status === 'INACTIVE').length;
    });
  }

  search(): void {
    this.visible = false;

    const q = this.searchValue.toLowerCase().trim();
    this.listOfDisplayData = this.dataSource.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.login?.toLowerCase().includes(q)
    );
  }

  submitUser() {
    if (!this.userForm.valid) return;

    this.isSaving = true;

    const userData = this.userForm.value;

    if (this.currentEditingUserId) {
      this.userService.updateUser(this.currentEditingUserId, userData).subscribe({
        next: () => {
          this.loadUsers();
          this.closeUserDrawer();
          this.message.success('Utilizador atualizado com sucesso.');
          this.isSaving = false;
        },
        error: () => {
          this.message.error('Erro ao atualizar o utilizador.');
          this.isSaving = false;
        }
      });
    } else {
      this.userService.addUser(userData).subscribe({
        next: () => {
          this.loadUsers();
          this.closeUserDrawer();
          this.message.success('Utilizador guardado com sucesso!');
          this.isSaving = false;
        },
        error: () => {
          this.message.error('Erro ao guardar o utilizador.');
          this.isSaving = false;
        }
      });
    }
  }

  ngOnInit(): void {
    this.loadUsers();
    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());
  }

  updateDrawer(): void {
    if (window.innerWidth <= 768) {
      this.drawerWidth = '100%';
      this.drawerPlacement = 'bottom';
    } else {
      this.drawerWidth = 720;
      this.drawerPlacement = 'right';
    }
  }


  reset(): void {
    this.searchValue = '';
    this.search();
  }

  phoneHref(phone: string | null | undefined): string {
    const digits = (phone || '').toString().replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : 'tel:';
  }


  open(): void {
    this.visible1 = true;
  }

  close(): void {
    this.visible1 = false;
  }

  viewUser(data: User) {
  }

  roleLabel(role: User['role']): string {
    const labels: Record<User['role'], string> = {
      ADMIN: 'Administrador',
      MANAGER: 'Gestor',
      OPERATOR: 'Operador',
      USER: 'Operador'
    };

    return labels[role] ?? role;
  }

  editUser(user: User) {
    this.currentEditingUserId = user.id;

    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      status: user.status,
      phone: user.phone,
      role: user.role,
    });
    this.isUserDrawerVisible = true;
  }

  openUserDrawer() {
    this.isUserDrawerVisible = true;
    this.currentEditingUserId = null;
    this.userForm.reset({status: 'CREATED', role: 'OPERATOR'});
  }

  closeUserDrawer() {
    this.isUserDrawerVisible = false;
    this.currentEditingUserId = null;
    this.userForm.reset({status: 'CREATED', role: 'OPERATOR'});
  }


  deleteUser(user: User): void {
    this.confirmationDialog.confirmDelete({
      entity: this.t('common.entities.user'),
      name: user.name,
      onOk: () => {
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            this.loadUsers();
            this.message.success('Utilizador eliminado com sucesso!');
          },
          error: () => {
            this.message.error("Erro ao eliminar o utilizador.");
          }
        });
      }
    });
  }

  private initForms(): void {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', Validators.required],
      password: [''],
      status: [''],
      phone: ['', Validators.required],
      role: ['OPERATOR', Validators.required],
    });
  }

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }
}
