/**
 * Branded types to prevent unit mixups (e.g., rupees vs paise, raw string vs validated ISO date)
 */
export type Paise = number & { readonly __brand: 'paise' }; // signed integer: credit +, debit -
export type IsoDate = string & { readonly __brand: 'iso-date' }; // 'YYYY-MM-DD'; calendar date
export type CategoryId = string & { readonly __brand: 'category-id' };
export type BankId = string & { readonly __brand: 'bank-id' };
