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
import FakeChart from "@/components/Chart";
import RecentActivity from "@/components/RecentActivity";

export default function DashboardPage() {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const [userRole, setUserRole] = useState<string>("");
  const [roleChecked, setRoleChecked] = useState(false);

  const [userName, setUserName] = useState("User");

  /* ---------------- AUTH + ROLE CHECK (igual que /usuarios) ---------------- */
  useEffect(() => {
    // Esperamos a Firebase
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading]);

  useEffect(() => {
    const verifyRole = async () => {
      if (!user) return;

      const db = getFirestore();
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : {};

      const role = data.role || "";

      setUserRole(role);
      setUserName(data.name || user.email?.split("@")[0] || "User");

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

  // Wrap the async logout so a void-returning function can be passed where () => void is expected
  const handleLogoutVoid = () => {
    // intentionally not awaited so this returns void
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
            Welcome, <span className="text-purple-600">{userName}</span>!
          </h1>

          <ThemeSwitch />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard title="Total Projects" value="185" />
          <StatsCard title="Active Tasks" value="552" />
          <StatsCard title="Completed" value="8488" />
        </div>

        {/* Charts + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-2 bg-white/70 dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow p-6">
            <h2 className="section-title">Project Overview</h2>
            <FakeChart />
          </div>

          <div className="bg-white/70 dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow p-6">
            <h2 className="section-title">Recent Activity</h2>
            <RecentActivity />
          </div>
        </div>

      </main>
    </div>
  );
}
