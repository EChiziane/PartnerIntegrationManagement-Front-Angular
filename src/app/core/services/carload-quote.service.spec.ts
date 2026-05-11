import {TestBed} from '@angular/core/testing';

import {CarloadQuoteService} from './carload-quote.service';

describe('CarloadQuoteService', () => {
  let service: CarloadQuoteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CarloadQuoteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
