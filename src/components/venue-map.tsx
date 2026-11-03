"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { divIcon, type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapVenue = {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  claimed: boolean;
  hourlyPrice: number | null;
};

function markerIcon(kind: "open" | "unclaimed" | "selected") {
  const label = kind === "open" ? "₹" : kind === "selected" ? "●" : "?";
  return divIcon({
    className: "",
    html: `<div class="pin pin-${kind === "open" ? "open" : kind}"><span>${label}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -28],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const signature = points.map((point) => point.join(",")).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(points, { padding: [28, 28], maxZoom: 15 });
  }, [map, points, signature]);
  return null;
}

function Clicks({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

export function VenueMap({
  venues,
  center,
}: {
  venues: MapVenue[];
  center: { lat: number; lng: number };
}) {
  const points = venues.map((venue) => [venue.lat, venue.lng] as [number, number]);
  const position: LatLngExpression = points[0] ?? [center.lat, center.lng];
  return (
    <MapContainer center={position} zoom={13} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points.length ? points : [[center.lat, center.lng]]} />
      {venues.map((venue) => (
        <Marker
          key={venue.id}
          position={[venue.lat, venue.lng]}
          icon={markerIcon(venue.claimed ? "open" : "unclaimed")}
        >
          <Popup>
            <a href={`/venues/${venue.id}`} className="font-semibold">
              {venue.name}
            </a>
            <br />
            {venue.area || "Area not tagged"}
            <br />
            {venue.claimed ? (venue.hourlyPrice != null ? `₹${venue.hourlyPrice}/hr` : "Price not listed") : "Unclaimed — claim this turf"}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export function PinPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number;
  lng: number;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer center={[lat, lng]} zoom={14} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Clicks onPick={onPick} />
      <Marker position={[lat, lng]} icon={markerIcon("selected")} />
    </MapContainer>
  );
}
