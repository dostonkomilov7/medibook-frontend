"use client";

// lib/MediAlert.ts assigns itself to `window.MediAlert` as a side
// effect when its module executes — but nothing in the app ever
// imported that module, so `window.MediAlert` was always `undefined`
// and every `(window as any).MediAlert?.toast(...)` / `.modal(...)`
// call across the app silently no-op'd (optional chaining swallowed
// the missing function). Importing it here, once, in a client
// component rendered from the root layout guarantees it's wired up
// before any page's code runs, on every route.
import "../lib/MediAlert";

export default function MediAlertInit() {
  return null;
}