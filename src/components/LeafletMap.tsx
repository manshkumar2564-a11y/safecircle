import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons (webpack/vite don't handle leaflet's image imports)
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

export type MapMarker = {
  id: string;
  lat: number;
  lon: number;
  popup?: string;
  color?: MarkerColor;
};

export type MarkerColor = 'blue' | 'red' | 'amber' | 'green' | 'violet';

const coloredIcon = (color: MarkerColor) => {
  const colors: Record<MarkerColor, string> = {
    blue: '#0284c7',
    red: '#dc2626',
    amber: '#d97706',
    green: '#16a34a',
    violet: '#7c3aed',
  };
  const fill = colors[color];
  return L.divIcon({
    className: 'safecircle-marker',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${fill};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const userIcon = L.divIcon({
  className: 'safecircle-user-marker',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#0f172a;border:3px solid #fbbf24;box-shadow:0 0 0 4px rgba(251,191,36,0.3);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export type LeafletMapProps = {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  userLocation?: { lat: number; lon: number } | null;
  routeLine?: [number, number][] | null;
  className?: string;
  onMapClick?: (lat: number, lon: number) => void;
  fitToMarkers?: boolean;
};

export default function LeafletMap({
  center,
  zoom = 14,
  markers = [],
  userLocation,
  routeLine = null,
  className = '',
  onMapClick,
  fitToMarkers = false,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    if (onMapClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    // Fix size after mount
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center when it changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom, { animate: true });
  }, [center, zoom]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const marker of markers) {
      const icon = marker.color ? coloredIcon(marker.color) : undefined;
      const m = L.marker([marker.lat, marker.lon], icon ? { icon } : undefined);
      if (marker.popup) m.bindPopup(marker.popup);
      m.addTo(map);
      markersRef.current.push(m);
    }

    if (fitToMarkers && markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lon] as [number, number]));
      if (userLocation) bounds.extend([userLocation.lat, userLocation.lon]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [markers, fitToMarkers, userLocation]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userLocation) {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lon], {
        icon: userIcon,
        zIndexOffset: 1000,
      })
        .bindPopup('Your location')
        .addTo(mapRef.current);
    }
  }, [userLocation]);

  // Update route line
  useEffect(() => {
    if (!mapRef.current) return;
    if (routeRef.current) {
      routeRef.current.remove();
      routeRef.current = null;
    }
    if (routeLine && routeLine.length > 1) {
      routeRef.current = L.polyline(routeLine, {
        color: '#0284c7',
        weight: 4,
        opacity: 0.7,
        dashArray: '8 6',
      }).addTo(mapRef.current);
    }
  }, [routeLine]);

  return <div ref={containerRef} className={className} />;
}
