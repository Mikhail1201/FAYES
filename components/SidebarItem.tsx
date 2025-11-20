export default function SidebarItem({
  icon,
  label,
  active,
}: {
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition
      ${
        active
          ? "bg-gradient-to-r from-orange-400 to-purple-600 text-white shadow"
          : "hover:bg-gray-200/60 dark:hover:bg-gray-800/40"
      }
      `}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
