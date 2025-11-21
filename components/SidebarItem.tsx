"use client";
export default function SidebarItem({
  icon,
  label,
  active,
  visible,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  visible?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl transition
        ${active
          ? "bg-gradient-to-r from-orange-400 to-purple-600 text-white shadow"
          : "hover:bg-gray-200/60 dark:hover:bg-gray-800/40"
        }
        ${visible === false ? "hidden" : ""}
      `}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
