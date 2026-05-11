import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Driver} from '@shared/models/driver';

@Component({
  selector: 'app-driver-details',
  standalone: false,
  templateUrl: './driver-details.component.html',
  styleUrl: './driver-details.component.scss'
})
export class DriverDetailsComponent {

  @Input() visible = false;
  @Input() driver: Driver | null = null;

  // Responsivo (igual ao teu padrão)
  @Input() drawerWidth: string | number = 560;
  @Input() drawerPlacement: 'right' | 'bottom' = 'right';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() edit = new EventEmitter<Driver>();
  @Output() remove = new EventEmitter<Driver>();

  get initials(): string {
    const name = (this.driver?.Name ?? '').trim();
    if (!name) return 'DR';
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? 'D';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase();
  }

  get statusColor(): string {
    const s = (this.driver?.status ?? '').toUpperCase();
    // no teu código tens ACTIVO/INACTIVO, mas na tabela comparas ATIVO.
    // Vamos considerar ambos:
    if (s === 'ACTIVO' || s === 'ATIVO') return 'green';
    return 'red';
  }

  get statusLabel(): string {
    const s = (this.driver?.status ?? '').toUpperCase();
    if (s === 'ACTIVO' || s === 'ATIVO') return 'ATIVO';
    if (s === 'INACTIVO') return 'INATIVO';
    return this.driver?.status ?? '';
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onEdit(): void {
    if (!this.driver) return;
    this.edit.emit(this.driver);
  }

  onDelete(): void {
    if (!this.driver) return;
    this.remove.emit(this.driver);
  }

}
