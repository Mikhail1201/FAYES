"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../app/firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

/* Components */
import Sidebar from "@/components/Sidebar";
import ThemeSwitch from "@/components/ThemeSwitch";
import StatsCard from "@/components/StatsCard";
import StockChart from "@/components/StockChart";
import LowStockAlert from "@/components/LowStockAlert";

/* ------------------------ API HELPERS ------------------------ */

async function fetchProducts() {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/handleProducts", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  try {
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchStock() {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/handleInventory", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  try {
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchUsers() {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/handleUsers", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  try {
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const [userRole, setUserRole] = useState<string>("");
  const [roleChecked, setRoleChecked] = useState(false);
  const [userName, setUserName] = useState("User");

  // Stats
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // Data for low stock alert
  const [products, setProducts] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);

  /* ---------------- LOAD STATS ---------------- */
  const loadStats = async () => {
    setStatsLoading(true);

    try {
      const [productsData, stockData, users] = await Promise.all([
        fetchProducts(),
        fetchStock(),
        fetchUsers(),
      ]);

      // Guardar datos para el componente de bajo stock
      setProducts(productsData);
      setStock(stockData);

      // Total de productos
      setTotalProducts(productsData.length);

      // Sumar todas las cantidades de stock
      const stockTotal = stockData.reduce((sum: number, item: any) => {
        return sum + (item.quantity || 0);
      }, 0);
      setTotalStock(stockTotal);

      // Total de usuarios
      setTotalUsers(users.length);
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  /* ---------------- AUTH + ROLE CHECK ---------------- */
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const verifyRole = async () => {
      if (!user) return;

      const db = getFirestore();
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : {};
      const role = data.role || "";

      setUserRole(role);
      setUserName(data.name || user.email?.split("@")[0] || "User");
      
      // Cargar estadísticas después de verificar el rol
      await loadStats();
      
      setRoleChecked(true);
    };

    verifyRole();
  }, [user]);

  // 🚫 No renderizar nada hasta que se verifique el rol
  if (loading || !user || !roleChecked) return null;

  /* ---------------------- PAGE CONTENT ---------------------- */
  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  const handleLogoutVoid = () => {
    void handleLogout();
  };

  return (
    <div className="min-h-screen bg-[#e8ebf2] dark:bg-[#0e0e12] flex">
      {/* Sidebar */}
      <Sidebar onLogout={handleLogoutVoid} />

      {/* MAIN */}
      <main className="flex-1 p-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-100">
            Bienvenido, <span className="text-purple-600">{userName}</span>!
          </h1>
          <ThemeSwitch />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard 
            title="Total de Productos" 
            value={statsLoading ? "..." : totalProducts.toString()} 
          />
          <StatsCard 
            title="Cantidad en Stock" 
            value={statsLoading ? "..." : totalStock.toString()} 
          />
          <StatsCard 
            title="Usuarios" 
            value={statsLoading ? "..." : totalUsers.toString()} 
          />
        </div>

        {/* Charts + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-2 bg-white/70 dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow p-6">
            <h2 className="section-title">Resumen del Proyecto</h2>
            <StockChart products={products} stock={stock} />
          </div>

          <div className="bg-white/70 dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow p-6 h-fit">
            <h2 className="section-title mb-4">Alerta de Stock Bajo</h2>
            <LowStockAlert products={products} stock={stock} />
          </div>
        </div>
      </main>
    </div>
  );
}