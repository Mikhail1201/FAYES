export default function ActivityItem({ text, user, priority }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-blue-300 dark:bg-blue-600" />
      <div className="flex-1">
        <p className="font-medium">{text}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{user}</p>
      </div>
      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
        {priority}
      </span>
    </div>
  );
}
