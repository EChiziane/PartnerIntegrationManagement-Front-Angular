import { Injectable } from '@angular/core';
import { CarloadQuote } from '../models/CarloadQuote';

@Injectable({
  providedIn: 'root'
})
export class CarloadQuoteService {
  private readonly storageKey = 'carload_quotes';

  getQuotes(): CarloadQuote[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  getQuoteById(id: string): CarloadQuote | null {
    return this.getQuotes().find(q => q.id === id) || null;
  }

  saveQuote(quote: CarloadQuote): void {
    const quotes = this.getQuotes();
    quotes.unshift(quote);
    localStorage.setItem(this.storageKey, JSON.stringify(quotes));
  }

  updateQuote(id: string, updatedQuote: CarloadQuote): void {
    const quotes = this.getQuotes().map(q => q.id === id ? updatedQuote : q);
    localStorage.setItem(this.storageKey, JSON.stringify(quotes));
  }

  deleteQuote(id: string): void {
    const quotes = this.getQuotes().filter(q => q.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(quotes));
  }

  duplicateQuote(id: string): CarloadQuote | null {
    const quote = this.getQuoteById(id);
    if (!quote) return null;

    const newQuote: CarloadQuote = {
      ...quote,
      id: this.generateId(),
      quoteCode: this.generateNextQuoteCode(),
      createdAt: new Date().toISOString()
    };

    this.saveQuote(newQuote);
    return newQuote;
  }

  generateNextQuoteCode(): string {
    const quotes = this.getQuotes();
    if (!quotes.length) return 'COT-1001';

    const max = Math.max(
      ...quotes.map(q => {
        const numeric = Number((q.quoteCode || '').replace(/\D/g, ''));
        return isNaN(numeric) ? 1000 : numeric;
      })
    );

    return `COT-${max + 1}`;
  }

  generateId(): string {
    return crypto.randomUUID();
  }
}
