"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";

type CityValue = {
  city: string;
  setCity: (city: string) => Promise<void>;
  center: { lat: number; lng: number };
  timezone: string;
};

const CityContext = createContext<CityValue | null>(null);

const defaults = {
  city: process.env.NEXT_PUBLIC_DEFAULT_CITY || "Vadodara",
  lat: Number(process.env.NEXT_PUBLIC_DEFAULT_LAT || 22.3072),
  lng: Number(process.env.NEXT_PUBLIC_DEFAULT_LNG || 73.1812),
  timezone: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Asia/Kolkata",
};

function subscribeCity(onStoreChange: () => void) {
  window.addEventListener("mohalla-city", onStoreChange);
  return () => window.removeEventListener("mohalla-city", onStoreChange);
}

function citySnapshot() {
  return localStorage.getItem("mohalla.city") || defaults.city;
}

export function CityProvider({ children }: { children: React.ReactNode }) {
  const city = useSyncExternalStore(subscribeCity, citySnapshot, () => defaults.city);
  const [center, setCenter] = useState({ lat: defaults.lat, lng: defaults.lng });

  useEffect(() => {
    if (city.toLowerCase() === defaults.city.toLowerCase()) return;
    let cancelled = false;
    fetch(`/api/geocode?q=${encodeURIComponent(`${city}, India`)}`)
      .then((response) => response.json())
      .then((data: { results?: { lat: number; lng: number }[] }) => {
        const hit = data.results?.[0];
        if (!cancelled && hit) setCenter({ lat: hit.lat, lng: hit.lng });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [city]);

  async function setCity(next: string) {
    const trimmed = next.trim();
    if (trimmed.length < 2) return;
    localStorage.setItem("mohalla.city", trimmed);
    window.dispatchEvent(new Event("mohalla-city"));
    if (trimmed.toLowerCase() === defaults.city.toLowerCase()) {
      setCenter({ lat: defaults.lat, lng: defaults.lng });
    }
  }

  const value = useMemo(() => ({ city, setCity, center, timezone: defaults.timezone }), [city, center]);
  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  const value = useContext(CityContext);
  if (!value) throw new Error("useCity must be used within CityProvider");
  return value;
}
