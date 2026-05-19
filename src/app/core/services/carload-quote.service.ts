import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, take } from 'rxjs';
import { environment } from '@env/environments';
import { CarloadQuote } from '@shared/models/carload-quote';
import { CarLoad } from '@shared/models/carload';

@Injectable({
  providedIn: 'root'
})
export class CarloadQuoteService {
  private baseURL = environment.baseURL + '/carload-quotes';

  constructor(private http: HttpClient) {}

  public getQuotes(): Observable<CarloadQuote[]> {
    return this.http.get<CarloadQuote[]>(this.baseURL);
  }

  public getQuoteById(id: string): Observable<CarloadQuote> {
    return this.http.get<CarloadQuote>(`${this.baseURL}/${id}`);
  }

  public getQuoteVersions(id: string): Observable<CarloadQuote[]> {
    return this.http.get<CarloadQuote[]>(`${this.baseURL}/${id}/versions`);
  }

  public addQuote(quote: any): Observable<CarloadQuote> {
    return this.http.post<CarloadQuote>(this.baseURL, quote).pipe(take(1));
  }

  public updateQuote(id: string, quote: any): Observable<CarloadQuote> {
    return this.http.put<CarloadQuote>(`${this.baseURL}/${id}`, quote).pipe(take(1));
  }

  public approveAndGenerateCarloads(id: string, payload: any = {}): Observable<CarLoad[]> {
    return this.http.post<CarLoad[]>(`${this.baseURL}/${id}/approve-and-generate-carloads`, payload).pipe(take(1));
  }

  public deleteQuote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseURL}/${id}`).pipe(take(1));
  }
}
