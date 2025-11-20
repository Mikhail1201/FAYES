"use client";

import SidebarItem from "./SidebarItem";
import {
  Home,
  BarChart3,
  Folder,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";

export default function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="w-64 bg-white/70 dark:bg-white/10 backdrop-blur-xl border-r border-white/20 p-6 flex flex-col gap-6 shadow-lg dark:shadow-none">

      {/* Logo */}
      <div className="text-center pb-4">
        <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-orange-400 to-purple-600 shadow"></div>
      </div>

      <nav className="flex flex-col gap-3 text-gray-700 dark:text-gray-200">
        <SidebarItem icon={<Home size={20} />} label="Dashboard" active />
        <SidebarItem icon={<BarChart3 size={20} />} label="Analytics" />
        <SidebarItem icon={<Folder size={20} />} label="Projects" />
        <SidebarItem icon={<Settings size={20} />} label="Settings" />
        <SidebarItem icon={<HelpCircle size={20} />} label="Help" />
      </nav>

      <button
        onClick={onLogout}
        className="flex items-center gap-3 text-red-600 mt-auto hover:bg-red-100 dark:hover:bg-red-900/30 p-2 rounded-xl transition"
      >
        <LogOut size={20} />
        Logout
      </button>

    </aside>
  );
}
