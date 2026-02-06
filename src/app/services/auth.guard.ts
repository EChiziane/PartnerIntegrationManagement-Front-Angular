import {CanActivate, Router} from '@angular/router';
import {Injectable} from '@angular/core';


@Injectable({providedIn: 'root'})
export class AuthGuard implements CanActivate {

    constructor(private router: Router) {
    }

    canActivate(): boolean {
        const token = localStorage.getItem('token');

        if (token) {
            return true;
        }

        this.router.navigate(['/login']);
        return false;
    }
}
