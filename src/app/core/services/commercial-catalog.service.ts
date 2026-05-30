import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, take} from 'rxjs';

import {environment} from '@env/environments';
import {CommercialCatalog} from '@shared/models/commercial-catalog';

@Injectable({
  providedIn: 'root'
})
export class CommercialCatalogService {
  private readonly baseURL = `${environment.baseURL}/commercial-catalogs`;

  constructor(private http: HttpClient) {
  }

  getCatalogs(): Observable<CommercialCatalog[]> {
    return this.http.get<CommercialCatalog[]>(this.baseURL);
  }

  getActiveCatalogs(): Observable<CommercialCatalog[]> {
    return this.http.get<CommercialCatalog[]>(`${this.baseURL}/active`);
  }

  updateCatalog(id: string, catalog: CommercialCatalog): Observable<CommercialCatalog> {
    return this.http.put<CommercialCatalog>(`${this.baseURL}/${id}`, catalog).pipe(take(1));
  }
}
