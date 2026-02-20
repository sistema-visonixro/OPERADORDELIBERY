import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Search } from "lucide-react";

type LocationPickerProps = {
  latitude?: number | null;
  longitude?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
};

declare global {
  interface Window {
    google: any;
  }
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar Google Maps script
  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyD9ZMr4EAvpCy-AW5dg2IsSJeC9bPTUFOQ&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    return () => {
      // No removemos el script porque puede ser usado en otros componentes
    };
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    // Ubicación por defecto (centro de México o la ubicación guardada)
    const defaultLat = latitude || 23.634501;
    const defaultLng = longitude || -102.552784;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: defaultLat, lng: defaultLng },
      zoom: latitude && longitude ? 15 : 5,
      mapTypeControl: false,
      streetViewControl: false,
    });

    mapInstanceRef.current = map;

    // Agregar marcador
    const marker = new window.google.maps.Marker({
      map: map,
      position: { lat: defaultLat, lng: defaultLng },
      draggable: true,
      title: "Ubicación del restaurante",
    });

    markerRef.current = marker;

    // Evento cuando se arrastra el marcador
    marker.addListener("dragend", () => {
      const position = marker.getPosition();
      onLocationChange(position.lat(), position.lng());
    });

    // Evento click en el mapa para mover el marcador
    map.addListener("click", (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.setPosition({ lat, lng });
      onLocationChange(lat, lng);
    });
  }, [isLoaded]);

  // Actualizar marcador cuando cambian las coordenadas externas
  useEffect(() => {
    if (!markerRef.current || !mapInstanceRef.current) return;
    if (latitude !== null && longitude !== null && latitude !== undefined && longitude !== undefined) {
      const newPos = { lat: latitude, lng: longitude };
      markerRef.current.setPosition(newPos);
      mapInstanceRef.current.setCenter(newPos);
    }
  }, [latitude, longitude]);

  // Buscar dirección
  const handleSearch = () => {
    if (!searchQuery || !isLoaded) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results: any, status: any) => {
      if (status === "OK" && results[0]) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(15);
          markerRef.current.setPosition({ lat, lng });
          onLocationChange(lat, lng);
        }
      } else {
        alert("No se pudo encontrar la ubicación. Intenta con otra búsqueda.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Ubicación del Restaurante
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Buscador de dirección */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="search-location">Buscar dirección</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="search-location"
                type="text"
                placeholder="Ej: Av. Insurgentes 123, CDMX"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearch}
                disabled={!isLoaded || !searchQuery}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div
          ref={mapRef}
          className="w-full h-96 rounded-lg border bg-muted"
          style={{ minHeight: "400px" }}
        >
          {!isLoaded && (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Cargando mapa...</p>
            </div>
          )}
        </div>

        {/* Coordenadas actuales */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Latitud</Label>
            <p className="font-mono text-sm">
              {latitude !== null && latitude !== undefined
                ? latitude.toFixed(6)
                : "No seleccionada"}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Longitud</Label>
            <p className="font-mono text-sm">
              {longitude !== null && longitude !== undefined
                ? longitude.toFixed(6)
                : "No seleccionada"}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Haz clic en el mapa o arrastra el marcador para seleccionar la ubicación exacta
        </p>
      </CardContent>
    </Card>
  );
}
