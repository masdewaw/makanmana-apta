import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { supabase } from '../lib/supabase'
import L from 'leaflet'

// Fix for default marker icons in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
    iconUrl: markerIcon as string,
    shadowUrl: markerShadow as string,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center)
  }, [center, map])
  return null
}

export default function TrackingMap({ obName }: { obName: string }) {
  const [pos, setPos] = useState<[number, number] | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInitialPos()

    const channel = supabase
      .channel('tracking-ob-view')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles' 
      }, (payload) => {
        const name = payload.new.name.toLowerCase()
        const isTarget = (obName === 'OB 1' && name.includes('bahul')) || 
                         (obName === 'OB 2' && name.includes('masber')) ||
                         (name === obName.toLowerCase())

        if (isTarget && payload.new.last_lat && payload.new.last_lng) {
          setPos([payload.new.last_lat, payload.new.last_lng])
          setLastUpdate(payload.new.last_updated_at)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [obName])

  const fetchInitialPos = async () => {
    try {
      let query = supabase.from('profiles').select('last_lat, last_lng, last_updated_at')
      
      if (obName === 'OB 1') query = query.ilike('name', '%bahul%')
      else if (obName === 'OB 2') query = query.ilike('name', '%masber%')
      else query = query.eq('name', obName)

      const { data } = await query.maybeSingle()
      if (data?.last_lat && data?.last_lng) {
        setPos([data.last_lat, data.last_lng])
        setLastUpdate(data.last_updated_at)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const isStale = lastUpdate && (new Date().getTime() - new Date(lastUpdate).getTime() > 24 * 60 * 60 * 1000)

  if (loading) {
    return <div className="h-[300px] bg-slate-50 animate-pulse rounded-3xl" />
  }

  if (!pos || isStale) {
    return (
      <div className="h-[300px] bg-slate-50 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-2xl">⏳</div>
        <p className="text-sm font-black text-slate-800">Lokasi OB Belum Tersedia</p>
        <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] text-center font-medium">Tracking akan aktif saat OB sedang bekerja. Cek kembali beberapa saat lagi.</p>
      </div>
    )
  }

  return (
    <div className="h-[300px] rounded-3xl overflow-hidden border border-slate-100 shadow-inner relative z-10">
      <MapContainer center={pos} zoom={16} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={pos}>
          <Popup className="font-bold">Posisi {obName}</Popup>
        </Marker>
        <ChangeView center={pos} />
      </MapContainer>
    </div>
  )
}
