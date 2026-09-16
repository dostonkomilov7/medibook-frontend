"use client";
import { useEffect } from "react";
import { installAuthFetchGuard } from "../lib/utils";

// Mounted once in the root layout, below, so the guard is active on
// every page from the very first render — not just pages that happen
// to import it themselves.
export default function AuthGuardInit() {
  useEffect(() => {
    installAuthFetchGuard();
  }, []);
  return null;
}
