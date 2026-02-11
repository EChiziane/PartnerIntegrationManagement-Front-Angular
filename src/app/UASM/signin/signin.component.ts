import {Component} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {AuthService} from '../../services/auth.service';

@Component({
  selector: 'app-signin',
  standalone: false,
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.scss'
})
export class SigninComponent {
  signinForm: FormGroup;

  isLoading = false;
  isPasswordVisible = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private msg: NzMessageService
  ) {
    this.signinForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required], // aqui guardamos só os dígitos (sem +258)
      login: ['', Validators.required],
      password: ['', Validators.required],
      role: ['USER', Validators.required]
    });
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  normalizePhone(): void {
    const raw = (this.signinForm.value.phone ?? '').toString();
    const digits = raw.replace(/\D/g, '');

    // Se o user colar +258..., remove o prefixo e fica só com os dígitos locais
    const normalized = digits.startsWith('258') ? digits.substring(3) : digits;

    this.signinForm.patchValue({phone: normalized});
  }

  submitForm(): void {
    if (this.signinForm.invalid) {
      Object.values(this.signinForm.controls).forEach(c => c.markAsTouched());
      this.msg.error('Preencha os campos obrigatórios.');
      return;
    }

    this.isLoading = true;
    const userPayload = this.buildPayload();

    this.authService.signup(userPayload).subscribe({
      next: () => {
        this.isLoading = false;
        this.msg.success('Utilizador registado com sucesso!');
        this.signinForm.reset({role: 'USER'});
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Erro ao registrar usuário:', err);
        this.msg.error('Falha ao registar utilizador.');
      }
    });
  }

  private buildPayload(): any {
    const v = this.signinForm.value;

    const phoneDigits = (v.phone ?? '').toString().replace(/\D/g, '');
    const phoneWithPrefix = phoneDigits.startsWith('258') ? `+${phoneDigits}` : `+258${phoneDigits}`;

    return {
      name: v.name?.trim(),
      email: v.email?.trim(),
      phone: phoneWithPrefix,
      login: v.login?.trim(),
      password: v.password,
      role: v.role
    };
  }
}
