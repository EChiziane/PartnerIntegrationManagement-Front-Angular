import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';

type TranslationDictionary = Record<string, unknown>;

export interface AppLanguage {
  code: string;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  readonly languages: AppLanguage[] = [
    {code: 'pt', label: 'Portugues'},
    {code: 'en', label: 'English'}
  ];

  private readonly storageKey = 'pi-language';
  private readonly fallbackLanguage = 'pt';
  private readonly dictionaries = new Map<string, TranslationDictionary>();
  private readonly currentLanguageSubject = new BehaviorSubject<string>(this.getInitialLanguage());

  readonly languageChanges$ = this.currentLanguageSubject.asObservable();

  constructor(private http: HttpClient) {
    this.use(this.currentLanguage).subscribe();
  }

  get currentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  use(language: string): Observable<string> {
    const safeLanguage = this.languages.some(item => item.code === language)
      ? language
      : this.fallbackLanguage;

    if (this.dictionaries.has(safeLanguage)) {
      this.commitLanguage(safeLanguage);
      return of(safeLanguage);
    }

    return this.http.get<TranslationDictionary>(`assets/i18n/${safeLanguage}.json`).pipe(
      tap(dictionary => this.dictionaries.set(safeLanguage, dictionary || {})),
      map(() => {
        this.commitLanguage(safeLanguage);
        return safeLanguage;
      }),
      catchError(() => {
        this.commitLanguage(this.fallbackLanguage);
        return of(this.fallbackLanguage);
      })
    );
  }

  instant(key: string, params?: Record<string, string | number | null | undefined>): string {
    const dictionary = this.dictionaries.get(this.currentLanguage)
      || this.dictionaries.get(this.fallbackLanguage)
      || {};

    const value = this.resolve(dictionary, key);
    const text = typeof value === 'string' ? value : key;

    if (!params) {
      return text;
    }

    return Object.entries(params).reduce((result, [paramKey, paramValue]) => {
      const pattern = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
      return result.replace(pattern, String(paramValue ?? ''));
    }, text);
  }

  private resolve(dictionary: TranslationDictionary, key: string): unknown {
    return key.split('.').reduce<unknown>((current, part) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[part];
    }, dictionary);
  }

  private commitLanguage(language: string): void {
    this.currentLanguageSubject.next(language);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, language);
    }
  }

  private getInitialLanguage(): string {
    if (typeof localStorage !== 'undefined') {
      const storedLanguage = localStorage.getItem(this.storageKey);

      if (storedLanguage && this.languages.some(item => item.code === storedLanguage)) {
        return storedLanguage;
      }
    }

    return this.fallbackLanguage;
  }
}
