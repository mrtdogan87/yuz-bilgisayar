import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomUUID } from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function newId(): string {
  return randomUUID();
}

export function normalizeUrl(url: string): string {
  if (!url) return url;
  url = url.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "https://" + url;
  }
  return url;
}

export function now(): string {
  return new Date().toISOString();
}
