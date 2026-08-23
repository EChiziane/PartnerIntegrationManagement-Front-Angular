import {Component, HostListener, Inject, OnInit, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'PartnerIntegrationManagement';

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
  }

  ngOnInit() {
    this.checkAuthentication();
    this.monitorToken();
  }

  checkAuthentication() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('authToken');
    }
  }

  isAuthenticated(): boolean {
    var str = localStorage.getItem('token');
    if (str == null) {
      return false;
    }
    return true;
  }


  onLoginSuccess() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', 'meuTokenDeAcesso');
    }
  }

  monitorToken() {
    if (isPlatformBrowser(this.platformId)) {
      setInterval(() => {
        if (!localStorage.getItem('token')) {
        }
      }, 1000);
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleOverlayKeyboardShortcuts(event: KeyboardEvent): void {
    if (!isPlatformBrowser(this.platformId) || event.defaultPrevented) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== 'Escape') {
      return;
    }

    if (this.shouldIgnoreShortcut(event)) {
      return;
    }

    const overlay = this.getTopVisibleOverlay();
    if (!overlay) {
      return;
    }

    const button = event.key === 'Enter'
      ? this.findFirstEnabledButton(overlay, [
        '.btn-save',
        '.ant-modal-footer .ant-btn-primary'
      ])
      : this.findFirstEnabledButton(overlay, [
        '.btn-cancel',
        '.ant-modal-footer .ant-btn-default',
        '.ant-drawer-close',
        '.ant-modal-close'
      ]);

    if (!button) {
      return;
    }

    event.preventDefault();
    button.click();
  }

  private shouldIgnoreShortcut(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    const activeElement = document.activeElement as HTMLElement | null;
    const element = target || activeElement;

    if (!element) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();

    if (element.isContentEditable || tagName === 'textarea') {
      return true;
    }

    if (document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden), .ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')) {
      return true;
    }

    if (event.key === 'Enter' && (tagName === 'button' || element.closest('button'))) {
      return true;
    }

    return false;
  }

  private getTopVisibleOverlay(): HTMLElement | null {
    const overlays = Array.from(document.querySelectorAll<HTMLElement>('.ant-drawer, .ant-modal-wrap'))
      .filter(element => this.isVisible(element));

    return overlays.length ? overlays[overlays.length - 1] : null;
  }

  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && rect.width > 0
      && rect.height > 0;
  }

  private findFirstEnabledButton(container: HTMLElement, selectors: string[]): HTMLButtonElement | null {
    for (const selector of selectors) {
      const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>(selector));
      const enabledButton = buttons.find(button => !button.disabled && !button.classList.contains('ant-btn-loading'));

      if (enabledButton) {
        return enabledButton;
      }
    }

    return null;
  }
}
