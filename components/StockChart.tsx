"use client";

import { useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Product = {
  id: string;
  name: string;
  price: number;
};

type StockItem = {
  id: string;
  quantity: number;
};

type StockChartProps = {
  products: Product[];
  stock: StockItem[];
};

// Colores para el gráfico
const COLORS = [
  '#8b5cf6', // purple-500
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
];

export default function StockChart({ products, stock }: StockChartProps) {
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  // Combinar productos con su stock
  const chartData = stock
    .map((stockItem) => {
      const product = products.find((p) => p.id === stockItem.id);
      return {
        name: product?.name || "Desconocido",
        stock: stockItem.quantity,
        fullName: product?.name || "Producto Desconocido",
      };
    })
    .filter((item) => item.stock > 0) // Solo mostrar productos con stock
    .sort((a, b) => b.stock - a.stock); // Ordenar de mayor a menor

  // Si no hay datos
  if (chartData.length === 0) {
    return (
      <div className="w-full h-80 bg-gradient-to-br from-purple-100 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-5xl mb-3">📊</div>
        <p className="font-medium">No hay datos de stock disponibles</p>
      </div>
    );
  }

  // Acortar nombres largos para el gráfico
  const chartDataWithShortNames = chartData.map((item) => ({
    ...item,
    name: item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
  }));

  return (
    <div className="w-full">
      {/* Botones de alternancia */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => setChartType("bar")}
          className={`cursor-pointer px-4 py-2 rounded-lg font-medium transition ${chartType === "bar"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
        >
          📊 Barras
        </button>
        <button
          onClick={() => setChartType("pie")}
          className={`cursor-pointer px-4 py-2 rounded-lg font-medium transition ${chartType === "pie"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
        >
          🥧 Circular
        </button>
      </div>

      {/* Gráfico de Barras */}
      {chartType === "bar" && (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartDataWithShortNames} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis tick={{ fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
              labelFormatter={(label) => {
                const item = chartData.find(d => d.name.startsWith(label.replace('...', '')));
                return item?.fullName || label;
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar
              dataKey="stock"
              fill="#8b5cf6"
              radius={[8, 8, 0, 0]}
              name="Cantidad en Stock"
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Gráfico Circular */}
      {chartType === "pie" && (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartDataWithShortNames}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => {
                const safePercent = percent ?? 0;  // <-- fallback
                return `${name}: ${(safePercent * 100).toFixed(0)}%`;
              }}
              outerRadius={120}
              fill="#8884d8"
              dataKey="stock"
            >
              {chartDataWithShortNames.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
              formatter={(value: any, name: any, props: any) => {
                const item = chartData.find(d => d.name.startsWith(props.payload.name.replace('...', '')));
                return [value, item?.fullName || props.payload.name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      {/* Leyenda de colores para gráfico circular */}
      {chartType === "pie" && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {chartDataWithShortNames.slice(0, 10).map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {item.fullName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}