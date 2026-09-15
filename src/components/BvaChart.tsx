'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

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
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={11} 
            tickLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            tickFormatter={(value: number) => `Rp ${(value / 1000000).toFixed(0)}Jt`}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
            formatter={(value: any) => [`Rp ${Number(value || 0).toLocaleString('id-ID')}`, '']}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar dataKey="RAB" fill="#10b981" radius={[4, 4, 0, 0]} name="Rencana (RAB)" />
          <Bar dataKey="Aktual" fill="#0284c7" radius={[4, 4, 0, 0]} name="Aktual Field" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}