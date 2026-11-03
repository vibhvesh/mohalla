"use client";

import dynamic from "next/dynamic";
import type { MapVenue } from "@/components/venue-map";

const VenueMap = dynamic(() => import("@/components/venue-map").then((mod) => mod.VenueMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-pitch/10" />,
});

const PinPicker = dynamic(() => import("@/components/venue-map").then((mod) => mod.PinPicker), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-pitch/10" />,
});

export function BrowseMap(props: { venues: MapVenue[]; center: { lat: number; lng: number } }) {
  return <VenueMap {...props} />;
}

export function LocationPicker(props: { lat: number; lng: number; onPick: (lat: number, lng: number) => void }) {
  return <PinPicker key={`${props.lat.toFixed(3)}-${props.lng.toFixed(3)}`} {...props} />;
}
