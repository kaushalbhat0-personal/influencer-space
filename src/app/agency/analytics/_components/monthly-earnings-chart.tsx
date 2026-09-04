"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface Point {
  month: string;
  gross: number;
  refunds: number;
  net: number;
}

export function MonthlyEarningsChart({ data }: { data: Point[] }) {
  const rows = data.map((d) => ({
    ...d,
    monthLabel: `${d.month.slice(5)}/${d.month.slice(0, 4)}`,
  }));
  const anyData = data.some((d) => d.gross !== 0 || d.refunds !== 0 || d.net !== 0);

  return (
    <div>
      <div className="h-64 w-full" role="img" aria-label="Monthly gross commission, refund adjustments and net commission">
        {anyData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="monthLabel" stroke="#71717a" tick={{ fontSize: 11 }} />
              <YAxis stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${v}`} />
              <Tooltip formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]} />
              <Legend />
              <Bar dataKey="gross" name="Gross" fill="var(--brand-primary)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="refunds" name="Refunds" fill="#f43f5e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="net" name="Net" fill="#34d399" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">No financial activity in the last 6 months.</div>
        )}
      </div>
      {/* Numeric table so values are never conveyed by color alone. */}
      <table className="admin-table mt-3">
        <thead>
          <tr>
            <th className="text-left">Month</th>
            <th className="text-right">Gross</th>
            <th className="text-right">Refunds</th>
            <th className="text-right">Net</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <td className="text-zinc-400 text-xs">{d.month}</td>
              <td className="text-right text-zinc-300">{formatCurrency(d.gross)}</td>
              <td className="text-right text-red-400/90">{formatCurrency(d.refunds)}</td>
              <td className="text-right text-white font-medium">{formatCurrency(d.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
