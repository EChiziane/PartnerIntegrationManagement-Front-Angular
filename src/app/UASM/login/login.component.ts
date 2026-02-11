import {Component, EventEmitter, Inject, OnInit, Output, PLATFORM_ID} from '@angular/core';
import {AuthService} from '../../services/auth.service';
import {Router} from '@angular/router';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {isPlatformBrowser} from '@angular/common';
import {NzMessageService} from 'ng-zorro-antd/message';

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

  isRegisterVisible = false;
  responseMessage: string | null = null;
  isLoading = false;

  // show/hide login password
  isPasswordVisible = false;

  // ===== Recovery Modal =====
  isForgotPasswordVisible = false;
  recoveryStep: 0 | 1 | 2 = 0;
  recoveryLoading = false;

  recoveryPreview: { maskedName: string; maskedEmail: string; maskedPhone: string } | null = null;

  forgotPasswordForm = new FormGroup({
    phoneWhatsApp: new FormControl('', [Validators.required])
  });

  resetPasswordForm = new FormGroup({
    otpCode: new FormControl('', [Validators.required, Validators.minLength(4)]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required])
  });

  isResetPasswordVisible = false;
  isResetConfirmVisible = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object,
    private msg: NzMessageService
  ) {
  }

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

  // ===== Register Modal =====
  openRegisterModal(): void {
    this.isRegisterVisible = true;
  }

  closeRegisterModal(): void {
    this.isRegisterVisible = false;
  }

  // ===== Recovery Modal =====
  openForgotPasswordModal(): void {
    this.isForgotPasswordVisible = true;
    this.recoveryStep = 0;
    this.recoveryPreview = null;
    this.forgotPasswordForm.reset();
    this.resetPasswordForm.reset();
  }

  closeForgotPasswordModal(): void {
    this.isForgotPasswordVisible = false;
  }

  toggleResetPasswordVisibility(): void {
    this.isResetPasswordVisible = !this.isResetPasswordVisible;
  }

  toggleResetConfirmVisibility(): void {
    this.isResetConfirmVisible = !this.isResetConfirmVisible;
  }

  requestRecovery(): void {
    if (this.forgotPasswordForm.invalid) {
      Object.values(this.forgotPasswordForm.controls).forEach(c => c.markAsTouched());
      this.msg.error('Informe o número de WhatsApp.');
      return;
    }

    const phone = this.normalizeMzPhoneToE164(this.forgotPasswordForm.value.phoneWhatsApp!);
    this.recoveryLoading = true;

    this.authService.requestPasswordReset(phone).subscribe({
      next: (preview) => {
        this.recoveryLoading = false;
        this.recoveryPreview = preview;
        this.recoveryStep = 1;
      },
      error: (err) => {
        this.recoveryLoading = false;
        console.error(err);
        this.msg.error('Não foi possível localizar a conta com esse WhatsApp.');
      }
    });
  }

  confirmRecovery(): void {
    const phone = this.normalizeMzPhoneToE164(this.forgotPasswordForm.value.phoneWhatsApp!);
    this.recoveryLoading = true;

    this.authService.confirmPasswordReset(phone).subscribe({
      next: () => {
        this.recoveryLoading = false;
        this.recoveryStep = 2;
        this.msg.success('Enviámos um código para o WhatsApp e email associados.');
      },
      error: (err) => {
        this.recoveryLoading = false;
        console.error(err);
        this.msg.error('Não foi possível iniciar o envio do código.');
      }
    });
  }

  backRecovery(): void {
    if (this.recoveryStep === 2) this.recoveryStep = 1;
    else if (this.recoveryStep === 1) this.recoveryStep = 0;
  }

  submitResetPassword(): void {
    if (this.resetPasswordForm.invalid) {
      Object.values(this.resetPasswordForm.controls).forEach(c => c.markAsTouched());
      this.msg.error('Preencha o código e a nova senha.');
      return;
    }

    const v = this.resetPasswordForm.value;

    if (v.newPassword !== v.confirmPassword) {
      this.msg.error('As senhas não coincidem.');
      return;
    }

    const phone = this.normalizeMzPhoneToE164(this.forgotPasswordForm.value.phoneWhatsApp!);
    this.recoveryLoading = true;

    this.authService.resetPassword(phone, v.otpCode!, v.newPassword!).subscribe({
      next: () => {
        this.recoveryLoading = false;
        this.msg.success('Senha alterada com sucesso. Já pode entrar.');
        this.closeForgotPasswordModal();
      },
      error: (err) => {
        this.recoveryLoading = false;
        console.error(err);
        this.msg.error('Código inválido ou expirado.');
      }
    });
  }

  private markAllTouched(): void {
    Object.values(this.userForm.controls).forEach(c => c.markAsTouched());
  }

  private normalizeMzPhoneToE164(raw: string): string {
    const digits = (raw ?? '').toString().replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('258')) return `+${digits}`;
    return `+258${digits}`;
  }
}
