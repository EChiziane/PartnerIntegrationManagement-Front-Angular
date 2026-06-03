import {Injectable} from '@angular/core';
import {NzModalService} from 'ng-zorro-antd/modal';
import {TranslationService} from '@core/services/translation.service';

interface DeleteConfirmationOptions {
  entity: string;
  name?: string | null;
  details?: string;
  onOk: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationDialogService {
  constructor(
    private modal: NzModalService,
    private translationService: TranslationService
  ) {
  }

  confirmDelete(options: DeleteConfirmationOptions): void {
    const itemName = options.name || this.t('common.notAvailable');
    const details = options.details || this.t('common.confirmation.deleteContent', {
      entity: options.entity,
      name: itemName
    });

    this.modal.confirm({
      nzCentered: true,
      nzClassName: 'tc-confirm-danger',
      nzTitle: this.t('common.confirmation.deleteTitle', {
        entity: options.entity,
        name: itemName
      }),
      nzContent: `${details}<br><br>${this.t('common.confirmation.deletePermanentWarning')}`,
      nzOkText: this.t('common.confirmation.deleteOk'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.t('common.actions.cancel'),
      nzOnOk: options.onOk
    });
  }

  private t(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }
}
