import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';
import {environment} from '@env/environments';
import {ProductPrice} from '@shared/models/product-price';

@Injectable({
  providedIn: 'root'
})
export class ProductPriceService {
  private readonly baseURL = `${environment.baseURL}/product-prices`;

  constructor(private http: HttpClient) {
  }

  getPrices(): Observable<ProductPrice[]> {
    return this.http.get<ProductPrice[]>(this.baseURL);
  }

  getActivePrices(): Observable<ProductPrice[]> {
    return this.http.get<ProductPrice[]>(`${this.baseURL}/active`);
  }

  addPrice(price: Partial<ProductPrice>): Observable<ProductPrice> {
    return this.http.post<ProductPrice>(this.baseURL, price).pipe(take(1));
  }

  updatePrice(id: string, price: Partial<ProductPrice>): Observable<ProductPrice> {
    return this.http.put<ProductPrice>(`${this.baseURL}/${id}`, price).pipe(take(1));
  }

  deletePrice(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseURL}/${id}`).pipe(take(1));
  }
}
