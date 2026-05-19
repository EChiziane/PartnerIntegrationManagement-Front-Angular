import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {LoginComponent} from '@features/auth/login/login.component';
import {SigninComponent} from '@features/auth/register/signin.component';
import {ListuserComponent} from '@features/users/list/listuser.component';


import {LandingPageComponent} from '@features/public/landing-page/landingpage.component';
import {MainLayoutComponent} from '@features/shell/main-layout/main-layout.component';
import {AuthGuard} from '@core/guards/auth.guard';
import {DriverComponent} from '@features/drivers/driver.component';
import {SprintComponent} from '@features/sprints/sprint.component';
import {ManagerComponent} from '@features/managers/manager.component';

import {SprintDetailsComponent} from '@features/sprints/sprint-details/sprint-details.component';
import {CarLoadComponent} from '@features/carloads/carload.component';
import {DashboardComponent} from '@features/dashboard/dashboard.component';
import {InvoiceComponent} from '@features/invoices/invoice.component';
import {QuatationComponent} from '@features/quotations/quatation.component';
import {CarloadCustomerComponent} from '@features/customers/carload-customer.component';
import {CarloadDetailsComponent} from '@features/carloads/carload-details/carload-details.component';
import {QuoteComponent} from '@features/quotes/quote.component';
import {UserDetailComponent} from '@features/users/detail/user-detail.component';
import {TruckComponent} from '@features/trucks/truck.component';
import {PaymentComponent} from '@features/payments/payment.component';
import {
  CarloadCustomerDetailComponent
} from '@features/customers/carload-customer-detail/carload-customer-detail.component';


const routes: Routes = [

  {path: '', redirectTo: 'landing-page', pathMatch: 'full'},
  {path: 'landing-page', component: LandingPageComponent},
  {path: 'login', component: LoginComponent},
  {path: 'register', component: SigninComponent},

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
      {path: 'quote', component: QuoteComponent},
      {path: 'manager', component: ManagerComponent},
      {path: 'sprint', component: SprintComponent},
      {path: 'truck', component: TruckComponent},
      {path: 'payment', component: PaymentComponent},
      {path: 'sprint-detail/:id', component: SprintDetailsComponent},
      {path: 'driver', component: DriverComponent},
      {path: 'carload-details/:id', component: CarloadDetailsComponent},
      {path: 'user-detail/:id', component: UserDetailComponent},
      {path: 'carload-customer-detail/:id', component: CarloadCustomerDetailComponent},


      {path: 'users', component: ListuserComponent},
      // Mantem o dashboard como primeira tela apos login.
      {path: '', redirectTo: 'dashboard', pathMatch: 'full'}
    ]
  },

  {path: '**', redirectTo: 'landing-page'}
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
