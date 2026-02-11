import { Component, EventEmitter, Inject, OnInit, Output, PLATFORM_ID } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  @Output() loginSuccess = new EventEmitter<void>();

  userForm = new FormGroup({
    login: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
    rememberMe: new FormControl(false)
  });

  forgotPasswordForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email])
  });

  validateForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    checkPassword: new FormControl('', [Validators.required]),
    nickname: new FormControl('', [Validators.required]),
    phoneNumberPrefix: new FormControl('+258'),
    phoneNumber: new FormControl('', [Validators.required]),
    website: new FormControl('', [Validators.required]),
    agree: new FormControl(false, Validators.requiredTrue)
  });

  isForgotPasswordVisible = false;
  isRegisterVisible = false;

  responseMessage: string | null = null;
  isLoading = false;

  // show/hide
  isPasswordVisible = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.logout();
  }

  logout() {
    localStorage.removeItem('token');
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  isInvalid(controlName: 'login' | 'password'): boolean {
    const c = this.userForm.get(controlName);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  private markAllTouched(): void {
    Object.values(this.userForm.controls).forEach(c => c.markAsTouched());
  }

  login() {
    this.responseMessage = null;

    if (this.userForm.invalid) {
      this.markAllTouched();
      this.responseMessage = 'Preencha todos os campos corretamente.';
      return;
    }

    this.isLoading = true;

    const login = this.userForm.value.login!;
    const password = this.userForm.value.password!;

    this.authService.login(login, password).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response && response.token && isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', response.token);
          this.loginSuccess.emit();
          this.router.navigate(['/app/dashboard']);
        } else {
          this.responseMessage = 'Erro ao receber o token da API.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Erro no login', err);
        this.responseMessage = 'Usuário ou senha inválidos.';
      }
    });
  }

  openForgotPasswordModal(): void {
    this.isForgotPasswordVisible = true;
  }

  closeForgotPasswordModal(): void {
    this.isForgotPasswordVisible = false;
  }

  recoverPassword(): void {
    if (this.forgotPasswordForm.valid) {
      console.log('Recuperação de senha:', this.forgotPasswordForm.value);
      this.closeForgotPasswordModal();
    } else {
      Object.values(this.forgotPasswordForm.controls).forEach(c => c.markAsTouched());
    }
  }

  openRegisterModal(): void {
    this.isRegisterVisible = true;
  }

  closeRegisterModal(): void {
    this.isRegisterVisible = false;
  }

  registerUser(): void {
    if (this.validateForm.valid) {
      console.log('Usuário registrado:', this.validateForm.value);
      this.closeRegisterModal();
    } else {
      Object.values(this.validateForm.controls).forEach(c => c.markAsTouched());
    }
  }

  confirmPasswordValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('password')?.value;
    const checkPassword = form.get('checkPassword')?.value;
    if (password && checkPassword && password !== checkPassword) {
      return { confirm: true };
    }
    return null;
  }
}
