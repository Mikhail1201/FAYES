"use client";

import { useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import Sidebar from "../../components/Sidebar";
import ThemeSwitch from "../../components/ThemeSwitch";
import ErrorDiv from "../../components/ErrorDiv";
import SuccessDiv from "../../components/SuccessDiv";

export default function ScannerPage() {
    const router = useRouter();

    const [user, loading] = useAuthState(auth);
    const [roleChecked, setRoleChecked] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    /* ---------------- AUTH CHECK ---------------- */

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading]);

    /* ------------- ROLE CHECK (solo admin y superadmin) ------------- */

    useEffect(() => {
        const verifyRole = async () => {
            if (!user) return;

            const db = getFirestore();
            const snap = await getDoc(doc(db, "users", user.uid));
            const data = snap.exists() ? snap.data() : {};

            const role = data.role || "";

            if (role !== "user" && role !== "admin" && role !== "superadmin") {
                router.push("/");
                return;
            }

            setRoleChecked(true);
        };

        verifyRole();
    }, [user]);

    if (loading || !user || !roleChecked) return null;

    /* ---------------- HANDLERS ---------------- */

    const handleCapture = async () => {
        setError("");
        setSuccess("");

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                setError("No hay sesión activa.");
                return;
            }

            const res = await fetch("/api/runScanner", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                setError(data.error || "Error al iniciar el escáner.");
                return;
            }

            setSuccess("Scanner iniciado correctamente.");
        } catch (e) {
            setError("Error inesperado al iniciar el escáner.");
        }
    };


    const handleCancel = async () => {
        setError("");
        setSuccess("");

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                setError("No hay sesión activa.");
                return;
            }

            const res = await fetch("/api/runScanner", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ action: "stop" }), // <-- AQUÍ SE PARA
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                setError(data.error || "Error al detener el escáner.");
                return;
            }

            setSuccess("Scanner detenido correctamente.");
        } catch {
            setError("Error inesperado al detener.");
        }
    };

    /* ---------------- RENDER ---------------- */

    return (
        <div className="min-h-screen bg-[#e8ebf2] dark:bg-[#0e0e12] flex">

            {/* NOTIFICACIONES */}
            <div className="z-50">
                <ErrorDiv message={error} onClose={() => setError("")} />
                <SuccessDiv message={success} onClose={() => setSuccess("")} />
            </div>

            {/* SIDEBAR */}
            <Sidebar onLogout={() => auth.signOut()} />

            <main className="flex-1 p-5 sm:p-10 relative flex flex-col items-center gap-6">

                <div className="top-6 right-6 absolute">
                    <ThemeSwitch />
                </div>

                <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-10">
                    Scanner
                </h1>

                {/* BOTONES */}
                <div className="flex flex-col sm:flex-row gap-5 mt-10 w-full max-w-2xl">

                    <button
                        onClick={handleCapture}
                        className="cursor-pointer flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xl font-semibold transition"
                    >
                        Capturar
                    </button>

                    <button
                        onClick={handleCancel}
                        className="cursor-pointer flex-1 py-4 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-xl text-xl font-semibold transition"
                    >
                        Cancelar
                    </button>

                </div>

            </main>
        </div>
    );
}
