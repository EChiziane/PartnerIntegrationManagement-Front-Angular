import {Component} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-landingpage',
  standalone: false,
  templateUrl: './landingpage.component.html',
  styleUrl: './landingpage.component.scss'
})
export class LandingPageComponent {
  menuVisible = false;

  constructor(private router: Router) {
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
