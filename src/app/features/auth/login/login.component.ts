import {Component, EventEmitter, Inject, OnInit, Output, PLATFORM_ID} from '@angular/core';
import {AuthService} from '@core/services/auth.service';
import {Router} from '@angular/router';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {TranslationService} from '@core/services/translation.service';

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

  isPasswordVisible = false;

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
    private msg: NzMessageService,
    private translationService: TranslationService
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

  login(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const loginValue = this.userForm.get('login')?.value;
    const passwordValue = this.userForm.get('password')?.value;

    const login = (loginValue ?? '').toString().trim();
    const password = (passwordValue ?? '').toString();

    if (!login || !password) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    this.authService.login(login, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/app/dashboard']);
      },
      error: () => {
        this.isLoading = false;
        this.responseMessage = this.t('auth.recovery.messages.invalidLogin');
      }
    });
  }


  openRegisterModal(): void {
    this.isRegisterVisible = true;
  }

  closeRegisterModal(): void {
    this.isRegisterVisible = false;
  }

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
      this.msg.error(this.t('auth.recovery.messages.whatsappRequired'));
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
      error: () => {
        this.recoveryLoading = false;
        this.msg.error(this.t('auth.recovery.messages.accountNotFound'));
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
        this.msg.success(this.t('auth.recovery.messages.codeSent'));
      },
      error: () => {
        this.recoveryLoading = false;
        this.msg.error(this.t('auth.recovery.messages.sendError'));
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
      this.msg.error(this.t('auth.recovery.messages.fillCodePassword'));
      return;
    }

    const v = this.resetPasswordForm.value;

    if (v.newPassword !== v.confirmPassword) {
      this.msg.error(this.t('auth.recovery.messages.passwordMismatch'));
      return;
    }

    const phone = this.normalizeMzPhoneToE164(this.forgotPasswordForm.value.phoneWhatsApp!);
    this.recoveryLoading = true;

    this.authService.resetPassword(phone, v.otpCode!, v.newPassword!).subscribe({
      next: () => {
        this.recoveryLoading = false;
        this.msg.success(this.t('auth.recovery.messages.passwordChanged'));
        this.closeForgotPasswordModal();
      },
      error: () => {
        this.recoveryLoading = false;
        this.msg.error(this.t('auth.recovery.messages.invalidCode'));
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

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }
}
