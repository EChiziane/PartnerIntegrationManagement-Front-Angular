import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {AuthGuard} from '@core/guards/auth.guard';
import {LoginComponent} from '@features/auth/login/login.component';
import {LandingPageComponent} from '@features/public/landing-page/landingpage.component';
import {MainLayoutComponent} from '@features/shell/main-layout/main-layout.component';
import {PartnerDashboardComponent} from '@features/partner-integration/dashboard/partner-dashboard.component';
import {PartnersComponent} from '@features/partner-integration/partners/partners.component';
import {PipelineComponent} from '@features/partner-integration/pipeline/pipeline.component';
import {TasksComponent} from '@features/partner-integration/tasks/tasks.component';
import {ScanComponent} from '@features/partner-integration/scan/scan.component';
import {RequestDetailComponent} from '@features/partner-integration/request-detail/request-detail.component';
import {PartnerDetailComponent} from '@features/partner-integration/partner-detail/partner-detail.component';

const routes: Routes = [
  {path: '', redirectTo: 'landing-page', pathMatch: 'full'},
  {path: 'landing-page', component: LandingPageComponent},
  {path: 'login', component: LoginComponent},
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {path: 'home', component: PartnerDashboardComponent},
      {path: 'partners', component: PartnersComponent},
      {path: 'pipeline', component: PipelineComponent},
      {path: 'tasks', component: TasksComponent},
      {path: 'scan', component: ScanComponent},
      {path: 'request/:id', component: RequestDetailComponent},
      {path: 'partner/:id', component: PartnerDetailComponent},
      {path: '', redirectTo: 'home', pathMatch: 'full'}
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
