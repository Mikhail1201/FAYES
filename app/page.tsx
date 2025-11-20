"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../app/firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
{/* Components */}
import Sidebar from "@/components/Sidebar";
import ThemeSwitch from "@/components/ThemeSwitch";
import StatsCard from "@/components/StatsCard";
import FakeChart from "@/components/Chart";
import RecentActivity from "@/components/RecentActivity";

export default function DashboardPage() {
  const [userName, setUserName] = useState("User");
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/login");
      else setUserName(user.email?.split("@")[0] || "User");
    });

    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#e8ebf2] dark:bg-[#0e0e12] flex">
      
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />

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
