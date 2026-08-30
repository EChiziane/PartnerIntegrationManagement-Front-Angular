import {APP_INITIALIZER, NgModule} from '@angular/core';
import {BrowserModule, provideClientHydration, withEventReplay} from '@angular/platform-browser';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HttpClientModule, provideHttpClient, withFetch, withInterceptorsFromDi} from '@angular/common/http';
import {registerLocaleData} from '@angular/common';
import en from '@angular/common/locales/en';

import {en_US, provideNzI18n} from 'ng-zorro-antd/i18n';
import {NzLayoutModule} from 'ng-zorro-antd/layout';
import {NzMenuModule} from 'ng-zorro-antd/menu';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzButtonModule} from 'ng-zorro-antd/button';
import {NzCardComponent} from 'ng-zorro-antd/card';
import {NzDrawerModule} from 'ng-zorro-antd/drawer';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzTagComponent} from 'ng-zorro-antd/tag';
import {NzAlertComponent} from 'ng-zorro-antd/alert';
import {NzDropDownModule} from 'ng-zorro-antd/dropdown';
import {NzModalModule} from 'ng-zorro-antd/modal';
import {NzMessageModule} from 'ng-zorro-antd/message';
import {NzSpinComponent} from 'ng-zorro-antd/spin';
import {NzCheckboxComponent} from 'ng-zorro-antd/checkbox';
import {NzEmptyComponent} from 'ng-zorro-antd/empty';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';

import {AppComponent} from './app.component';
import {AppRoutingModule} from './app-routing.module';
import {IconsProviderModule} from './icons-provider.module';
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
import {ConnectionsComponent} from '@features/partner-integration/connections/connections.component';
import {ConnectionDetailComponent} from '@features/partner-integration/connection-detail/connection-detail.component';
import {TranslatePipe} from '@shared/pipes/translate.pipe';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';

registerLocaleData(en);

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    LandingPageComponent,
    MainLayoutComponent,
    PartnerDashboardComponent,
    PartnersComponent,
    PipelineComponent,
    TasksComponent,
    ScanComponent,
    RequestDetailComponent,
    PartnerDetailComponent,
    ConnectionsComponent,
    ConnectionDetailComponent,
    TranslatePipe
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    IconsProviderModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NzLayoutModule,
    NzDropDownModule,
    NzMenuModule,
    NzInputModule,
    NzButtonModule,
    NzDrawerModule,
    NzSelectModule,
    NzModalModule,
    NzMessageModule,
    NzCardComponent,
    NzTagComponent,
    NzAlertComponent,
    NzSpinComponent,
    NzCheckboxComponent,
    NzEmptyComponent
  ],
  providers: [
    provideClientHydration(withEventReplay()),
    provideNzI18n(en_US),
    provideAnimationsAsync(),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [PartnerIntegrationService],
      useFactory: (partnerIntegration: PartnerIntegrationService) => () => partnerIntegration.loadFromTextFiles()
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
