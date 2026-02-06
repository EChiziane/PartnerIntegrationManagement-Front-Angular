import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {LoginComponent} from './UASM/login/login.component';
import {SigninComponent} from './UASM/signin/signin.component';
import {ListuserComponent} from './UASM/listuser/listuser.component';
import {CustomerDetailsComponent} from './WSM/customer/customer-details/customer-details.component';
import {PaymentDetailsComponent} from './WSM/payment/payment-details/payment-details.component';
import {PaymentComponent} from './WSM/payment/payment.component';
import {CustomerComponent} from './WSM/customer/customer.component';
import {CalendarComponent} from './calendar/calendar.component';
import {ReciboComponent} from './WSM/recibo/recibo.component';
import {LandingPageComponent} from './landpage/landingpage.component';
import {MainLayoutComponent} from './main-layout/main-layout.component';
import {AuthGuard} from './services/auth.guard';
import {DriverComponent} from './driver/driver.component';
import {SprintComponent} from './sprint/sprint.component';
import {ManagerComponent} from './manager/manager.component';

import {SprintDetailsComponent} from './sprint-details/sprint-details.component';
import {CarLoadComponent} from './carload/carload.component';


const routes: Routes = [

  // 🌍 Público
  {path: '', redirectTo: 'landing-page', pathMatch: 'full'},
  {path: 'landing-page', component: LandingPageComponent},
  {path: 'login', component: LoginComponent},
  {path: 'register', component: SigninComponent},

  // 🔐 Sistema protegido
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {path: 'carload', component: CarLoadComponent},
      {path: 'manager', component: ManagerComponent},
      {path: 'sprint', component: SprintComponent},
      {path: 'sprint-detail/:id', component: SprintDetailsComponent},
      {path: 'driver', component: DriverComponent},
      {path: 'customer', component: CustomerComponent},
      {path: 'customer-detail/:id', component: CustomerDetailsComponent},

      {path: 'payment', component: PaymentComponent},
      {path: 'payment-detail/:id', component: PaymentDetailsComponent},

      {path: 'calendar', component: CalendarComponent},
      {path: 'recibo', component: ReciboComponent},
      {path: 'users', component: ListuserComponent},

      // rota default do sistema
      {path: '', redirectTo: 'customer', pathMatch: 'full'}
    ]
  },

  // fallback
  {path: '**', redirectTo: 'landing-page'}
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
