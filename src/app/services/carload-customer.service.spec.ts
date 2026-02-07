import {TestBed} from '@angular/core/testing';

import {CarloadCustomerService} from './carload-customer.service';

describe('CarloadCustomerService', () => {
  let service: CarloadCustomerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CarloadCustomerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
