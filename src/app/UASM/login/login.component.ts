import {Component, EventEmitter, Inject, OnInit, Output, PLATFORM_ID} from '@angular/core';
import {AuthService} from '../../services/auth.service';
import {Router} from '@angular/router';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {isPlatformBrowser} from '@angular/common';

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
  visible1 = false;
  isLoading = false; // <=== estado do spinner

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
  }

  ngOnInit(): void {
    this.logout();
  }

  logout() {
    localStorage.removeItem('token');
  }

  login() {
    if (this.userForm.valid) {
      this.isLoading = true; // mostra o spinner
      this.responseMessage = null;

      this.authService.login(this.userForm.value.login!, this.userForm.value.password!).subscribe({
        next: (response) => {
          this.isLoading = false; // esconde o spinner
          if (response && response.token && isPlatformBrowser(this.platformId)) {
            localStorage.setItem('token', response.token);
            this.loginSuccess.emit();
            this.router.navigate(['/app/customer']);
          } else {
            this.responseMessage = 'Erro ao receber o token da API.';
          }
        },
        error: err => {
          this.isLoading = false; // esconde o spinner
          console.error('Erro no login', err);
          this.responseMessage = 'Usuário ou senha inválidos.';
        }
      });
    } else {
      this.responseMessage = 'Preencha todos os campos corretamente.';
    }
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
    }
  }

  close(): void {
    this.visible1 = false;
  }

  open(): void {
    this.visible1 = true;
  }

  confirmPasswordValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('password')?.value;
    const checkPassword = form.get('checkPassword')?.value;
    if (password && checkPassword && password !== checkPassword) {
      return {confirm: true};
    }
    return null;
  }

  submitForm(): void {
    if (this.validateForm.valid) {
      console.log('Form submitted successfully:', this.validateForm.value);
    } else {
      console.log('Form is invalid!');
    }
  }
}
