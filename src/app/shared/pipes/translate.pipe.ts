import {ChangeDetectorRef, OnDestroy, Pipe, PipeTransform} from '@angular/core';
import {Subscription} from 'rxjs';
import {TranslationService} from '@core/services/translation.service';

@Pipe({
  name: 'translate',
  standalone: false,
  pure: false
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private readonly subscription: Subscription;

  constructor(
    private translationService: TranslationService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.subscription = this.translationService.languageChanges$.subscribe(() => {
      this.changeDetectorRef.markForCheck();
    });
  }

  transform(key: string, params?: Record<string, string | number | null | undefined>): string {
    return this.translationService.instant(key, params);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
