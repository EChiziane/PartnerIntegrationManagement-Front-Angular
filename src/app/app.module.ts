import {NgModule} from '@angular/core';
import {BrowserModule, provideClientHydration, withEventReplay} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {IconsProviderModule} from './icons-provider.module';
import {NzLayoutModule} from 'ng-zorro-antd/layout';
import {NzMenuModule} from 'ng-zorro-antd/menu';
import {en_US, provideNzI18n} from 'ng-zorro-antd/i18n';
import {registerLocaleData} from '@angular/common';
import en from '@angular/common/locales/en';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {
  HTTP_INTERCEPTORS,
  HttpClientModule,
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi
} from '@angular/common/http';

import {NzAutosizeDirective, NzInputDirective, NzInputGroupComponent, NzInputModule} from 'ng-zorro-antd/input';
import {NzButtonComponent, NzButtonModule} from 'ng-zorro-antd/button';
import {NzDatePickerComponent, NzDatePickerModule, NzRangePickerComponent} from 'ng-zorro-antd/date-picker';
import {NzCardComponent} from 'ng-zorro-antd/card';
import {NzFilterTriggerComponent, NzTableModule, NzThAddOnComponent} from 'ng-zorro-antd/table';

import {NzDrawerComponent, NzDrawerContentDirective, NzDrawerModule} from 'ng-zorro-antd/drawer';
import {NzSelectComponent, NzSelectModule} from 'ng-zorro-antd/select';
import {NzRadioModule} from 'ng-zorro-antd/radio';
import {NzFormDirective, NzFormModule} from 'ng-zorro-antd/form';
import {NzColDirective, NzRowDirective} from 'ng-zorro-antd/grid';
import {NzDividerComponent} from 'ng-zorro-antd/divider';

import {NzSwitchComponent, NzSwitchModule} from 'ng-zorro-antd/switch';

import {NzTagComponent} from 'ng-zorro-antd/tag';
import {AuthInterceptor} from '@core/interceptors/auth-interceptor';
import {LoginComponent} from '@features/auth/login/login.component';
import {NzAlertComponent} from 'ng-zorro-antd/alert';
import {NzAutocompleteModule} from 'ng-zorro-antd/auto-complete';
import {NzCheckboxComponent} from 'ng-zorro-antd/checkbox';
import {NzDropDownModule} from 'ng-zorro-antd/dropdown';
import {MainLayoutComponent} from '@features/shell/main-layout/main-layout.component';
import {NzModalModule} from 'ng-zorro-antd/modal';
import {NzAvatarModule} from 'ng-zorro-antd/avatar';

import {ListuserComponent} from '@features/users/list/listuser.component';
import {SigninComponent} from '@features/auth/register/signin.component';
import {NzStatisticComponent} from 'ng-zorro-antd/statistic';

import {NzPageHeaderComponent, NzPageHeaderContentDirective} from 'ng-zorro-antd/page-header';
import {NzSpaceComponent, NzSpaceItemDirective} from 'ng-zorro-antd/space';
import {NzDescriptionsComponent, NzDescriptionsItemComponent} from 'ng-zorro-antd/descriptions';

import {NzSpinComponent} from 'ng-zorro-antd/spin';
import {NzTooltipDirective} from "ng-zorro-antd/tooltip";

import {NzCarouselComponent, NzCarouselContentDirective} from 'ng-zorro-antd/carousel';
import {LandingPageComponent} from '@features/public/landing-page/landingpage.component';
import {NzBreadCrumbComponent, NzBreadCrumbItemComponent} from "ng-zorro-antd/breadcrumb";
import {DriverComponent} from '@features/drivers/driver.component';
import {ManagerComponent} from '@features/managers/manager.component';
import {SprintComponent} from '@features/sprints/sprint.component';
import {CarLoadComponent} from '@features/carloads/carload.component';
import {DashboardComponent} from '@features/dashboard/dashboard.component';
import {InvoiceComponent} from '@features/invoices/invoice.component';
import {CarloadCustomerComponent} from '@features/customers/carload-customer.component';
import {SprintDetailsComponent} from '@features/sprints/sprint-details/sprint-details.component';
import {DriverDetailsComponent} from '@features/drivers/driver-details/driver-details.component';
import {NzEmptyComponent} from 'ng-zorro-antd/empty';
import {ManagerDetailsComponent} from '@features/managers/manager-details/manager-details.component';
import {CarloadDetailsComponent} from '@features/carloads/carload-details/carload-details.component';
import {QuoteComponent} from '@features/quotes/quote.component';
import {QuatationComponent} from '@features/quotations/quatation.component';
import {UserDetailComponent} from '@features/users/detail/user-detail.component';
import {TruckComponent} from '@features/trucks/truck.component';
import {PaymentComponent} from '@features/payments/payment.component';
import {ProductPriceComponent} from '@features/product-prices/product-price.component';
import {CommercialCatalogComponent} from '@features/commercial-catalogs/commercial-catalog.component';
import {
  CarloadCustomerDetailComponent
} from '@features/customers/carload-customer-detail/carload-customer-detail.component';
import {TranslatePipe} from '@shared/pipes/translate.pipe';
import {PartnerDashboardComponent} from '@features/partner-integration/dashboard/partner-dashboard.component';
import {PartnersComponent} from '@features/partner-integration/partners/partners.component';
import {PipelineComponent} from '@features/partner-integration/pipeline/pipeline.component';
import {TasksComponent} from '@features/partner-integration/tasks/tasks.component';
import {ScanComponent} from '@features/partner-integration/scan/scan.component';
import {RequestDetailComponent} from '@features/partner-integration/request-detail/request-detail.component';
import {PartnerDetailComponent} from '@features/partner-integration/partner-detail/partner-detail.component';


registerLocaleData(en);

@NgModule({
  declarations: [
    AppComponent,

    LoginComponent,
    MainLayoutComponent,
    SigninComponent,
    ListuserComponent,
    DriverComponent,
    ManagerComponent,
    SprintComponent,
    CarLoadComponent,
    LandingPageComponent,
    DashboardComponent,
    InvoiceComponent,
    CarloadCustomerComponent,
    SprintDetailsComponent
    , DriverDetailsComponent
    , ManagerDetailsComponent
    , CarloadDetailsComponent,
    QuoteComponent,
    QuatationComponent,
    UserDetailComponent,
    TruckComponent,
    PaymentComponent,
    ProductPriceComponent,
    CommercialCatalogComponent,
    CarloadCustomerDetailComponent,
    PartnerDashboardComponent,
    PartnersComponent,
    PipelineComponent,
    TasksComponent,
    ScanComponent,
    RequestDetailComponent,
    PartnerDetailComponent,
    TranslatePipe

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    IconsProviderModule,
    HttpClientModule,
    NzLayoutModule,
    NzDropDownModule,
    NzMenuModule,
    FormsModule,
    NzInputDirective,
    NzButtonComponent,
    NzDividerComponent,
    NzTableModule,
    NzLayoutModule,
    NzDropDownModule,
    NzMenuModule,
    FormsModule,
    NzInputDirective,
    NzButtonComponent,
    NzDividerComponent,
    NzTableModule,
    NzFilterTriggerComponent,
    NzThAddOnComponent,
    NzRowDirective,
    NzColDirective,
    NzCardComponent,
    NzDrawerComponent,
    NzFormDirective,
    NzInputGroupComponent,
    NzSelectComponent,
    NzRangePickerComponent,
    NzAutosizeDirective,
    NzDrawerContentDirective,
    NzDatePickerComponent,
    NzButtonModule,
    NzDrawerModule,
    NzDatePickerModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzRadioModule,
    ReactiveFormsModule,
    NzSwitchComponent,
    NzTagComponent,
    NzAlertComponent,
    NzAutocompleteModule,
    NzCheckboxComponent,
    NzModalModule,
    NzAvatarModule,
    NzSwitchModule,
    NzStatisticComponent,

    NzPageHeaderComponent,
    NzSpaceComponent,
    NzPageHeaderContentDirective,
    NzSpaceItemDirective,
    NzDescriptionsComponent,
    NzDescriptionsItemComponent,
    NzSpinComponent,
    NzTooltipDirective,
    NzCarouselComponent,
    NzCarouselContentDirective,
    NzBreadCrumbItemComponent,
    NzBreadCrumbComponent,
    NzEmptyComponent

  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    provideClientHydration(withEventReplay()),
    provideNzI18n(en_US),
    provideAnimationsAsync(),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),


  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
