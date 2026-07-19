'use client';

import { useState, MouseEvent, useEffect, useMemo, useCallback, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, } from '@vis.gl/react-google-maps';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type LocationData = {
  mapType: 'ludico' | 'geo';
  ludico?: { x: number; y: number };
  geo?: { lat: number; lng: number };
};

interface MapSelectorProps {
  ludicMapUrl: string | null;
  onLocationChange: (location: LocationData | null) => void;
  initialLocation?: LocationData | null;
  defaultCenter?: { lat: number; lng: number };
}

interface ImageRenderMetrics {
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
}


// Componente de pino reutilizável
const CustomMapPin = () => {
  return <MapPin className="h-6 w-6 fill-red-500 stroke-white stroke-2 drop-shadow-lg" />;
};

function LudicMap({
  mapUrl,
  onClick,
  marker,
}: {
  mapUrl: string;
  onClick: (e: MouseEvent<HTMLDivElement>) => void;
  marker: { x: number; y: number } | null;
}) {
  return (
    <div onClick={onClick} className="relative w-full aspect-video bg-muted border rounded-md cursor-pointer overflow-hidden">
      <img src={mapUrl} alt="Mapa Lúdico" className="w-full h-full object-contain pointer-events-none" style={{ display: 'block' }} />
      {marker && (
        <div
          className="absolute pointer-events-none"
          style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: 'translate(-50%, -100%)' }}
        >
          <CustomMapPin />
        </div>
      )}
    </div>
  );
}

function GoogleMapComponent({
  onMapClick,
  marker,
  center,
}: {
  onMapClick: (e: any) => void;
  marker: { lat: number; lng: number } | null;
  center: { lat: number; lng: number };
}) {
  return (
    <div className="w-full h-[500px] border rounded-md overflow-hidden">
      <Map
        defaultCenter={center}
        defaultZoom={18}
        gestureHandling={'greedy'}
        disableDefaultUI={false}
        mapId="b3b3c3e8f9b9a9e" // ID para customização (opcional)
        mapTypeId={'satellite'}
        onClick={onMapClick}
      >
        {marker && (
          <AdvancedMarker 
            position={marker}
            // Força o pino a ser renderizado, mesmo que colida com outros, e esconde o texto literal.
            collisionBehavior={'REQUIRED_AND_HIDES_OPTIONAL'}
          >
            <Pin scale={0.8} />
          </AdvancedMarker>
        )}
      </Map>
    </div>
  );
}

export function MapSelector({ ludicMapUrl, onLocationChange, initialLocation, defaultCenter }: MapSelectorProps) {
  // Adiciona resiliência contra dados antigos que podem ser strings.
  const safeInitialLocation = typeof initialLocation === 'string' ? null : initialLocation;

  const [mapType, setMapType] = useState<'ludico' | 'geo'>(safeInitialLocation?.mapType || 'ludico');
  const [ludicMarker, setLudicMarker] = useState<{ x: number; y: number } | null>(safeInitialLocation?.ludico || null);
  const [geoMarker, setGeoMarker] = useState<{ lat: number; lng: number } | null>(safeInitialLocation?.geo || null);
  const [imageRenderMetrics, setImageRenderMetrics] = useState<ImageRenderMetrics | null>(null);
  
  // Define o centro inicial do mapa.
  // Prioridade 1: Localização da ocorrência sendo editada.
  // Prioridade 2: Centro padrão configurado pelo usuário.
  // Prioridade 3: Coordenada padrão (fallback).
  const center = useMemo(() => (
    safeInitialLocation?.mapType === 'geo' && safeInitialLocation.geo
      ? safeInitialLocation.geo
      : defaultCenter || { lat: -25.0945, lng: -50.1633 }
  ), [safeInitialLocation, defaultCenter]);

  // Efeito para sincronizar o estado interno quando a localização inicial muda.
  // Isso é crucial para o modo de edição, onde `initialLocation` pode ser carregado após a montagem inicial.
  useEffect(() => {
    if (safeInitialLocation) {
      setMapType(safeInitialLocation.mapType || 'ludico');
      setLudicMarker(safeInitialLocation.ludico || null);
      setGeoMarker(safeInitialLocation.geo || null);
    }
  }, [safeInitialLocation]);

  const handleLudicMapClick = (e: MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const imageElement = container.querySelector('img');
    if (!imageElement) return;

    // Pega as dimensões e posição da imagem renderizada na tela
    const imageRect = imageElement.getBoundingClientRect();
    // Pega as dimensões e posição do container
    const containerRect = container.getBoundingClientRect();

    // Calcula a posição do clique relativa ao container
    const clickXInContainer = e.clientX - containerRect.left;
    const clickYInContainer = e.clientY - containerRect.top;

    // Calcula a posição do clique relativa à imagem (descontando as bordas vazias do object-contain)
    const clickXInImage = clickXInContainer - (imageRect.left - containerRect.left);
    const clickYInImage = clickYInContainer - (imageRect.top - containerRect.top);

    // Calcula a posição percentual dentro da imagem renderizada
    const xPercent = (clickXInImage / imageRect.width) * 100;
    const yPercent = (clickYInImage / imageRect.height) * 100;

    // Garante que o pino não seja marcado fora da imagem
    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;

    const newMarker = { x: xPercent, y: yPercent };
    setLudicMarker(newMarker);
    onLocationChange({ mapType: 'ludico', ludico: newMarker, geo: geoMarker || undefined });
  };

  const handleGeoMapClick = (e: any) => {
    const newMarker = {
      lat: e.detail.latLng.lat,
      lng: e.detail.latLng.lng,
    };
    setGeoMarker(newMarker);
    onLocationChange({ mapType: 'geo', geo: newMarker, ludico: ludicMarker || undefined });
  };

  const handleMapTypeChange = (newMapType: 'ludico' | 'geo') => {
    setMapType(newMapType);
    // Notifica a mudança de tipo de mapa, mantendo as coordenadas já marcadas
    onLocationChange({
      mapType: newMapType,
      ludico: ludicMarker || undefined,
      geo: geoMarker || undefined,
    });
  };

  console.log('Chave carregada:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  const apiKey = 'AIzaSyAHSWMrKodwOLXO7VGTq35r6vFgOJ-AH9I';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-1 bg-muted rounded-md">
          <Button
            type="button"
            variant={mapType === 'ludico' ? 'default' : 'ghost'}
            onClick={() => handleMapTypeChange('ludico')} 
            className="flex-1"
          >
            Mapa Lúdico
          </Button>
          <Button
            type="button"
            variant={mapType === 'geo' ? 'default' : 'ghost'}
            onClick={() => handleMapTypeChange('geo')}
            className="flex-1"
          >
            Mapa Georreferenciado
          </Button>
        </div>
        {(ludicMarker || geoMarker) && (
          <div className="text-center text-xs text-muted-foreground font-mono p-1 bg-muted/50 rounded-md">
            {mapType === 'ludico' && ludicMarker ? (
              <span>
                X: {ludicMarker.x.toFixed(2)}% | Y: {ludicMarker.y.toFixed(2)}%
              </span>
            ) : mapType === 'geo' && geoMarker ? (
              <span>
                Lat: {geoMarker.lat.toFixed(6)} | Lng: {geoMarker.lng.toFixed(6)}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {mapType === 'ludico' ? (
        ludicMapUrl ? (
          <LudicMap onClick={handleLudicMapClick} marker={ludicMarker} mapUrl={ludicMapUrl} />
        ) : (
          <div className="flex items-center justify-center w-full h-[500px] bg-muted border rounded-md">
            <p className="text-muted-foreground">Nenhum mapa lúdico foi configurado.</p>
          </div>
        )
      ) : !apiKey ? (
        <div className="flex items-center justify-center w-full h-[500px] bg-muted border rounded-md">
          <p className="text-center text-muted-foreground">
            Configuração de API necessária para o mapa georreferenciado.
          </p>
        </div>
      ) : (
        <>
          <APIProvider apiKey={apiKey}>
            <GoogleMapComponent onMapClick={handleGeoMapClick} marker={geoMarker} center={center} />
          </APIProvider>
          <p className="text-xs text-muted-foreground text-center p-2 border rounded-md bg-muted/50">
            <strong>Dica do Street View:</strong> Para uma visão em 360°, clique e arraste o "bonequinho" (Pegman) localizado no canto inferior do mapa para o ponto desejado. As imagens do Street View são fornecidas diretamente pelo Google Maps; por isso, esteja ciente de que, em alguns locais, os registros visuais podem estar desatualizados em relação ao cenário atual.
          </p>
        </>
      )}
    </div>
  );
}