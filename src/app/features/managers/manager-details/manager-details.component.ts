import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Manager} from '@shared/models/manager';

@Component({
  selector: 'app-manager-details',
  standalone: false,
  templateUrl: './manager-details.component.html',
  styleUrl: './manager-details.component.scss'
})

export class ManagerDetailsComponent {
  @Input() visible = false;
  @Input() manager: Manager | null = null;

  @Input() drawerWidth: string | number = 560;
  @Input() drawerPlacement: 'right' | 'bottom' = 'right';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() edit = new EventEmitter<Manager>();
  @Output() remove = new EventEmitter<Manager>();

  get initials(): string {
    const name = (this.manager?.name ?? '').trim();
    if (!name) return 'MG';
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? 'M';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase();
  }

  get statusColor(): string {
    const s = (this.manager?.status ?? '').toUpperCase();
    if (s === 'ACTIVO' || s === 'ATIVO') return 'green';
    return 'red';
  }

  get statusLabel(): string {
    const s = (this.manager?.status ?? '').toUpperCase();
    if (s === 'ACTIVO' || s === 'ATIVO') return 'ATIVO';
    if (s === 'INACTIVO') return 'INATIVO';
    return this.manager?.status ?? '';
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onEdit(): void {
    if (!this.manager) return;
    this.edit.emit(this.manager);
  }

  onDelete(): void {
    if (!this.manager) return;
    this.remove.emit(this.manager);
  }
}
