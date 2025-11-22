"use client";

import LowStockItem from "./LowStockItem";

type Product = {
  id: string;
  name: string;
  price: number;
};

type StockItem = {
  id: string;
  quantity: number;
};

type LowStockAlertProps = {
  products: Product[];
  stock: StockItem[];
};

export default function LowStockAlert({ products, stock }: LowStockAlertProps) {
  // Filtrar productos con stock <= 30 y ordenar por cantidad (menor a mayor)
  const lowStockItems = stock
    .filter((item) => item.quantity <= 30)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 3) // Solo los 3 con menor stock
    .map((stockItem) => {
      const product = products.find((p) => p.id === stockItem.id);
      return {
        productName: product?.name || "Producto desconocido",
        quantity: stockItem.quantity,
        price: product?.price || 0,
      };
    });

  // Si no hay productos con bajo stock
  if (lowStockItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 text-5xl">✅</div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          ¡Todo bien!
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          No hay productos con stock bajo
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {lowStockItems.map((item, index) => (
        <LowStockItem
          key={index}
          productName={item.productName}
          quantity={item.quantity}
          price={item.price}
        />
      ))}
    </div>
  );
}