import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatValidity(years: string | number, months: string | number): string {
  const numYears = Number(years);
  const numMonths = Number(months);

  const yearText = numYears > 0 ? `${numYears} ${numYears === 1 ? 'ano' : 'anos'}` : '';
  const monthText = numMonths > 0 ? `${numMonths} ${numMonths === 1 ? 'mês' : 'meses'}` : '';

  if (yearText && monthText) {
    return `${yearText} e ${monthText}`;
  }
  if (yearText) {
    return yearText;
  }
  if (monthText) {
    return monthText;
  }
  return '';
}
