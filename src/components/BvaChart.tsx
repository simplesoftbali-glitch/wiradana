'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import type { TooltipValueType } from 'recharts'

interface ChartData {
  name: string
  RAB: number
  Aktual: number
}

export default function BvaChart({ data }: { data: ChartData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-500 font-mono">
        Belum ada data proyek untuk ditampilkan pada grafik.
      </div>
    )
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.7} />
          <XAxis 
            dataKey="name" 
            stroke="#64748b"
            fontSize={11} 
            tickLine={false}
          />
          <YAxis 
            stroke="#64748b"
            fontSize={10} 
            tickFormatter={(value: number) => `Rp ${(value / 1000000).toFixed(0)}Jt`}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '0.75rem', color: '#0f172a' }}
            formatter={(value: TooltipValueType | undefined) => [`Rp ${Number(value || 0).toLocaleString('id-ID')}`, '']}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar dataKey="RAB" fill="#059669" radius={[4, 4, 0, 0]} name="Rencana (RAB)" />
          <Bar dataKey="Aktual" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Aktual Field" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}