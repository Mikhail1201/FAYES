"use client";

import SidebarItem from "./SidebarItem";
import {
  Home,
  Folder,
  User,
  Apple,
  LogOut
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth } from "../app/firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";

export default function Sidebar({
  onLogout,
}: {
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [userRole, setUserRole] = useState<string>("");
  useEffect(() => {
      const verifyRole = async () => {
        if (!user) return;
  
        const db = getFirestore();
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? snap.data() : {};
  
        const role = data.role || "";
  
        setUserRole(role);
      }
      verifyRole();
    }, [user]);

  const visibilityUser = userRole ? userRole === "user" || userRole === "admin" || userRole === "superadmin" : false ;
  const visibilityAdmin = userRole ? userRole === "admin" || userRole === "superadmin" : false;
  const visibilitySuperAdmin = userRole ? userRole === "superadmin" : false;

  const menu = [
    {
      label: "Dashboard",
      icon: <Home size={20} />,
      path: "/",
      visible: visibilityUser,
    },

    {
      label: "Inventario",
      icon: <Folder size={20} />,
      path: "/inventario",
      visible: visibilityUser,

    },

    {
      label: "Administrar Usuarios",
      icon: <User size={20} />,
      path: "/usuarios",
      visible: visibilityAdmin,
    },

    {
      label: "Productos",
      icon: <Apple size={20} />,
      path: "/productos",
      visible: visibilityUser,
    },
  ];

  return (
    <aside className="w-64 bg-white/70 dark:bg-white/10 backdrop-blur-xl border-r border-white/20 p-6 flex flex-col gap-6 shadow-lg dark:shadow-none">

      {/* Logo */}
      <div className="text-center pb-4">
        <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-orange-400 to-purple-600 shadow"></div>
      </div>

      {/* Menu */}
      <nav className="flex flex-col gap-3 text-gray-700 dark:text-gray-200">
        {menu.map((item) => (
          <SidebarItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            active={pathname === item.path}
            onClick={() => router.push(item.path)}
            visible={item.visible}
          />
        ))}

        {/* Logout */}
        <button
          onClick={onLogout}
          className="cursor-pointer flex items-center gap-3 text-red-600 mt-auto hover:bg-red-100 dark:hover:bg-red-900/30 p-3 rounded-xl transition"
        >
          <LogOut size={20} />
          Logout
        </button>
      </nav>
    </aside>
  );
}
