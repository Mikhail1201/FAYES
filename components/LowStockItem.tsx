type LowStockItemProps = {
  productName: string;
  quantity: number;
  price: number;
};

export default function LowStockItem({ productName, quantity, price }: LowStockItemProps) {
  // Determinar el nivel de alerta según la cantidad
  const getAlertLevel = (qty: number) => {
    if (qty <= 10) return { color: "bg-red-500", text: "Crítico", textColor: "text-red-600 dark:text-red-400" };
    if (qty <= 20) return { color: "bg-orange-500", text: "Bajo", textColor: "text-orange-600 dark:text-orange-400" };
    return { color: "bg-yellow-500", text: "Alerta", textColor: "text-yellow-600 dark:text-yellow-400" };
  };

  const alertLevel = getAlertLevel(quantity);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
      {/* Indicador de alerta */}
      <div className={`h-10 w-10 rounded-full ${alertLevel.color} flex items-center justify-center text-white font-bold`}>
        {quantity}
      </div>

      {/* Info del producto */}
      <div className="flex-1">
        <p className="font-medium text-gray-800 dark:text-gray-200">{productName}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Precio: ${price.toFixed(2)}
        </p>
      </div>

      {/* Badge de nivel */}
      <span className={`text-xs font-semibold px-2 py-1 rounded ${alertLevel.textColor} bg-gray-200 dark:bg-gray-700`}>
        {alertLevel.text}
      </span>
    </div>
  );
}