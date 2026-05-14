import {Component, Inject, OnInit, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
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
}
