import {ComponentFixture, TestBed} from '@angular/core/testing';

import {CarloadDetailsComponent} from './carload-details.component';

describe('CarloadDetailsComponent', () => {
  let component: CarloadDetailsComponent;
  let fixture: ComponentFixture<CarloadDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CarloadDetailsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CarloadDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
