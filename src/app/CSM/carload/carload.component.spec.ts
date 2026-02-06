import {ComponentFixture, TestBed} from '@angular/core/testing';

import {CarloadComponent} from './carload.component';

describe('CarloadComponent', () => {
  let component: CarloadComponent;
  let fixture: ComponentFixture<CarloadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CarloadComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CarloadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
