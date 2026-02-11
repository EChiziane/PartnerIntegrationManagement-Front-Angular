import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {LoginComponent} from './UASM/login/login.component';
import {SigninComponent} from './UASM/signin/signin.component';
import {ListuserComponent} from './UASM/listuser/listuser.component';


import {LandingPageComponent} from './landpage/landingpage.component';
import {MainLayoutComponent} from './CSM/main-layout/main-layout.component';
import {AuthGuard} from './services/auth.guard';
import {DriverComponent} from './CSM/driver/driver.component';
import {SprintComponent} from './CSM/sprint/sprint.component';
import {ManagerComponent} from './CSM/manager/manager.component';

import {SprintDetailsComponent} from './CSM/sprint/sprint-details/sprint-details.component';
import {CarLoadComponent} from './CSM/carload/carload.component';
import {DashboardComponent} from './CSM/dashboard/dashboard.component';
import {InvoiceComponent} from './CSM/invoice/invoice.component';
import {QuatationComponent} from './CSM/quatation/quatation.component';
import {CarloadCustomerComponent} from './CSM/carload-customer/carload-customer.component';
import {CarloadDetailsComponent} from './CSM/carload/carload-details/carload-details.component';


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
      {path: 'dashboard', component: DashboardComponent},
      {path: 'carload', component: CarLoadComponent},
      {path: 'quotation', component: QuatationComponent},
      {path: 'carload-customer', component: CarloadCustomerComponent},
      {path: 'invoice', component: InvoiceComponent},
      {path: 'manager', component: ManagerComponent},
      {path: 'sprint', component: SprintComponent},
      {path: 'sprint-detail/:id', component: SprintDetailsComponent},
      {path: 'driver', component: DriverComponent},
      {path: 'carload-details/:id', component: CarloadDetailsComponent},


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
