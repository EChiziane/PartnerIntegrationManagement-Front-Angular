import {Component} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-landingpage',
  standalone: false,
  templateUrl: './landingpage.component.html',
  styleUrls: ['./landingpage.component.scss']
})
export class LandingPageComponent {
  constructor(private router: Router) {
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
