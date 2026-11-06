import { errorMessage } from '@/lib/errors';
import { profileService } from '@/api/profiles';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin, Navigation, Clock, Zap } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet icon issue
import 'leaflet/dist/leaflet.css';

interface TrackingMapProps {
  obName: string;
}

// Component to recenter map when location changes
const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

// Custom Moped Icon
const mopedIcon = L.divIcon({
  html: `<div style="font-size: 24px; background: white; border-radius: 50%; border: 3px solid #f59e0b; width: 44px; height: 44px; display: flex; items-center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15)">🛵</div>`,
  className: 'custom-moped-icon',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const TrackingMap: React.FC<TrackingMapProps> = ({ obName }) => {
  const [retry, setRetry] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLocation(null);
    setLastUpdated(null);
    
    const fetchLocation = async () => {
      try {
      const { data, error } = await profileService.getLocationByCode(obName);
      if (error) throw error;
      if (active) setLoadError(null);
      
      if (active && data && data.last_lat != null && data.last_lng != null) {
        setLocation({ lat: data.last_lat, lng: data.last_lng });
        setLastUpdated(data.last_updated_at);
      }
      } catch (error) { if (active) setLoadError(errorMessage(error)); }
    };

    void fetchLocation();

    const channel = supabase
      .channel(`tracking-location-${crypto.randomUUID()}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles' 
      }, (payload) => {
        if (payload.new.ob_code === obName) void fetchLocation();
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [obName, retry]);

  const getTimeAgo = (timestamp: string | null) => {
    if (!timestamp) return 'Belum ada data';
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Baru saja';
    return `${Math.floor(seconds / 60)} menit yang lalu`;
  };

  return (
    <div className="w-full space-y-4">
      <div className="w-full aspect-video bg-slate-100 rounded-[24px] overflow-hidden relative border-4 border-white shadow-2xl group z-0">
        {loadError && <button className="absolute top-2 inset-x-2 z-[1000] bg-red-50 p-2 text-sm" onClick={() => setRetry(value => value + 1)}>Gagal memuat lokasi. Coba lagi.</button>}
        {!location ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-3">
             <Zap className="w-8 h-8 text-emerald-500 animate-pulse" />
             <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-normal text-center">
               Mencari koordinat GPS {obName}...
             </p>
          </div>
        ) : (
          <MapContainer 
            center={[location.lat, location.lng]} 
            zoom={16} 
            scrollWheelZoom={false}
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[location.lat, location.lng]} icon={mopedIcon}>
              <Popup className="font-sans">
                <div className="p-1">
                  <p className="font-semibold text-xs">{obName}</p>
                  <p className="text-[11px] text-slate-500 uppercase">{getTimeAgo(lastUpdated)}</p>
                </div>
              </Popup>
            </Marker>
            <RecenterMap lat={location.lat} lng={location.lng} />
          </MapContainer>
        )}

        {/* Floating Badges */}
        {location && (
          <div className="absolute top-4 right-4 z-1000">
             <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[12px] font-semibold text-slate-800 uppercase tracking-tight">LIVE TRACKING</span>
             </div>
          </div>
        )}

        {/* Coordinates Display */}
        {location && (
          <div className="absolute bottom-4 left-4 right-4 z-1000 bg-white/90 backdrop-blur-md p-3 rounded-2xl flex items-center justify-between border border-white shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-normal leading-none">Posisi Terkini</p>
                <p className="text-[12px] font-mono text-slate-800 mt-0.5 tracking-tight">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-800 uppercase">{getTimeAgo(lastUpdated)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3">
        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-slate-800 uppercase">Informasi Lokasi</h4>
          <p className="text-[12px] text-slate-500 font-bold leading-relaxed mt-1 uppercase">
            LOKASI DIUPDATE SETIAP 10 DETIK. JIKA POSISI TIDAK BERGERAK, KEMUNGKINAN OB SEDANG DI DALAM PERJALANAN ATAU SINYAL GPS LEMAH
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrackingMap;
