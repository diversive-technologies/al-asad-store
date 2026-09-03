import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * CMP-12 / STY-07 — THE class-merge helper. Conditional classes go through this
 * function; manual string concatenation produces conflicting utilities that
 * Tailwind cannot resolve deterministically.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
