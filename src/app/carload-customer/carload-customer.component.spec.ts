import {ComponentFixture, TestBed} from '@angular/core/testing';

import {CarloadCustomerComponent} from './carload-customer.component';

describe('CarloadCustomerComponent', () => {
  let component: CarloadCustomerComponent;
  let fixture: ComponentFixture<CarloadCustomerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CarloadCustomerComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CarloadCustomerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
