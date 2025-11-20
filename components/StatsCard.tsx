export default function StatsCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white/70 dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow p-6">
      <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
      <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mt-1">
        {value}
      </h3>
    </div>
  );
}
