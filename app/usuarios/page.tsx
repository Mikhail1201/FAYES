"use client";

import { useEffect, useState, useRef, MouseEvent, FormEvent, ReactNode } from "react";
import { auth } from "../firebase/config";
import {
  EmailAuthProvider,
  reauthenticateWithCredential
} from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  Trash,
  PencilLine,
} from "lucide-react";

import Sidebar from "../../components/Sidebar";
import ThemeSwitch from "../../components/ThemeSwitch";

// 🔥 SOLO AÑADIDO:
import ErrorDiv from "../../components/ErrorDiv";
import SuccessDiv from "../../components/SuccessDiv";

/* ------------------------ UTIL FIRESTORE METHODS ------------------------ */

async function fetchUsers() {
  const token = await auth.currentUser?.getIdToken();

  const res = await fetch("/api/handleUsers", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  try {
    const data = await res.json();

    const normalizeDate = (val: any): string | null => {
      if (val == null) return null;
      if (typeof val === "object") {
        if (typeof val.seconds === "number") {
          const ms = val.seconds * 1000 + (val.nanoseconds ? Math.floor(val.nanoseconds / 1e6) : 0);
          const d = new Date(ms);
          return isNaN(d.getTime()) ? null : d.toISOString();
        }
        if (typeof val._seconds === "number") {
          const ms = val._seconds * 1000 + (val._nanoseconds ? Math.floor(val._nanoseconds / 1e6) : 0);
          const d = new Date(ms);
          return isNaN(d.getTime()) ? null : d.toISOString();
        }
        if (typeof val.toDate === "function") {
          try {
            const d = val.toDate();
            return d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : null;
          } catch {
            return null;
          }
        }
        return null;
      }

      if (typeof val === "string") {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString();
      }

      if (typeof val === "number") {
        const ms = val > 1e12 ? val : val * 1000;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d.toISOString();
      }

      return null;
    };

    return (Array.isArray(data) ? data : []).map((u: any) => ({
      ...u,
      createdAt: normalizeDate(u.createdAt),
    }));
  } catch {
    return [];
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function createUser(data: any) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/handleUsers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return await safeJson(res);
}

async function updateUser(uid: string, data: any) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/handleUsers", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ uid, ...data }),
  });
  return await safeJson(res);
}

async function deleteUser(uid: string) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/handleUsers", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`},
    body: JSON.stringify({ uid }),
  });
  return await safeJson(res);
}

/* ----------------------------- PAGE START ----------------------------- */

export default function UsuariosPage() {
  const router = useRouter();

  type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string | null;
  };

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);

  const tableRef = useRef<HTMLDivElement | null>(null);

  /* ----- AUTH ----- */

  const [user, loading] = useAuthState(auth);
  const [roleChecked, setRoleChecked] = useState(false);
  const [userRole, setUserRole] = useState("");

  // 🔥 SOLO AÑADIDO:
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadUsers = async () => {
    const data = await fetchUsers();
    setUsers(data);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const verify = async () => {
      if (!user) return;

      const db = getFirestore();
      const snap = await getDoc(doc(db, "users", user.uid));

      const data = snap.exists() ? snap.data() : {};
      const role = data.role || "";

      setUserRole(role);

      if (role !== "admin" && role !== "superadmin") {
        router.push("/");
        return;
      }

      await loadUsers();
      setRoleChecked(true);
    };

    verify();
  }, [user]);

  if (loading || !user || !roleChecked) return null;

  /* ------------------------ HANDLE ROW CLICK ------------------------ */

  const handleRowClick = (e: MouseEvent<HTMLTableRowElement>, user: any) => {
    const tableEl = tableRef.current;
    if (!tableEl) return;

    setMenuPos({
      x: e.clientX + 5,
      y: e.clientY + 5,
    });

    setSelectedUser(user);
    setShowMenu(true);
  };

  /* ------------------------ MODAL ACTIONS ----------------------------- */

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);

    const res = await createUser({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      role: form.get("role"),
    });

    if (!res || res.error) {
      setError(res?.error || "Error al crear usuario.");
      return;
    }

    setSuccess("Usuario creado exitosamente.");
    setShowCreateModal(false);
    loadUsers();
  };

  const handleEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedUser) {
      setShowEditModal(false);
      return;
    }

    const form = new FormData(e.target as HTMLFormElement);

    const res = await updateUser(selectedUser.id, {
      name: form.get("name"),
      role: form.get("role"),
    });

    if (!res || res.error) {
      setError(res?.error || "Error al actualizar usuario.");
      console.log(res?.error);
      return;
    }

    setSuccess("Usuario actualizado correctamente.");
    setShowEditModal(false);
    setShowMenu(false);
    loadUsers();
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setDeleteError("");

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("No hay usuario autenticado.");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        deletePassword
      );

      await reauthenticateWithCredential(currentUser, credential);

      const res = await deleteUser(selectedUser.id);

      if (!res || res.error) {
        setError(res?.error || "No se pudo eliminar el usuario.");
        return;
      }

      setSuccess("Usuario eliminado correctamente.");
      setShowDeleteModal(false);
      setShowMenu(false);
      setDeletePassword("");
      loadUsers();
    } catch {
      setError("Contraseña incorrecta.");
    }
  };

  /* -------------------------- RENDER PAGE ---------------------------- */

  return (
    <div className="min-h-screen bg-[#e8ebf2] dark:bg-[#0e0e12] flex">
      <div className="z-51">
        <ErrorDiv message={error} onClose={() => setError("")} />
        <SuccessDiv message={success} onClose={() => setSuccess("")} />
      </div>
      {/* SIDEBAR */}
      <Sidebar onLogout={() => auth.signOut()}/>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-5 sm:p-10">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-100">
            Administrar Usuarios
          </h1>
          <ThemeSwitch />
        </div>

        {/* USERS TABLE */}
        <div
          ref={tableRef}
          className="bg-white/70 dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl overflow-x-auto p-4 sm:p-6"
        >
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-gray-200/70 dark:bg-gray-700/40 text-sm sm:text-base">
                <th className="p-3">Nombre</th>
                <th className="p-3">Email</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Fecha</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  onClick={(e) => handleRowClick(e, u)}
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/40 transition text-sm sm:text-base"
                >
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Botón Crear */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="cursor-pointer w-full mt-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xl font-semibold transition"
          >
            +
          </button>
        </div>

        {/* -------------------- POPUP MENU -------------------- */}
        {showMenu && (
          <div
            className="absolute bg-white dark:bg-gray-800 shadow-xl rounded-lg p-2 z-50 w-40 border border-gray-300 dark:border-gray-700"
            style={{ top: menuPos.y, left: menuPos.x }}
            onMouseLeave={() => setShowMenu(false)}
          >
            <button
              className="flex gap-3 cursor-pointer block w-full text-left px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              onClick={() => {
                setShowEditModal(true);
                setShowMenu(false);
              }}
            >
              <PencilLine size={20} /> Actualizar
            </button>

            <button
              className="flex gap-3 cursor-pointer block w-full text-left px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 text-red-500 rounded"
              onClick={() => {
                setShowDeleteModal(true);
                setShowMenu(false);
              }}
            >
              <Trash size={20} /> Borrar
            </button>
          </div>
        )}

        {/* -------------------- MODALS -------------------- */}

        {showCreateModal && (
          <Modal onClose={() => setShowCreateModal(false)}>
            <h2 className="modal-title">Crear Usuario</h2>

            <form onSubmit={handleCreate} className="modal-form">
              <input name="name" placeholder="Nombre" className="modal-input" required />
              <input name="email" type="email" placeholder="Email" className="modal-input" required />
              <input name="password" type="password" placeholder="Contraseña" className="modal-input" required />

              <select name="role" className="modal-input cursor-pointer" required>
                <option value="admin">Admin</option>
                <option value="user">Usuario</option>
              </select>

              <div className="modal-buttons">
                <button className="cursor-pointer btn-primary">Crear</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary cursor-pointer">
                  Cancelar
                </button>
              </div>
            </form>
          </Modal>
        )}

        {showEditModal && selectedUser && (
          <Modal onClose={() => setShowEditModal(false)}>
            <form onSubmit={handleEdit} className="modal-form">
              <h2 className="modal-title text-red-500">Editar Usuario</h2>
              <input
                name="name"
                defaultValue={selectedUser.name}
                className="modal-input"
                required
              />

              <select name="role" defaultValue={selectedUser.role} className="modal-input cursor-pointer">
                <option value="admin">Admin</option>
                <option value="user">Usuario</option>
              </select>

              <input
                name="password"
                type="password"
                placeholder="Nueva contraseña (opcional)"
                className="modal-input"
              />

              <div className="modal-buttons">
                <button className="cursor-pointer btn-primary">Guardar</button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="cursor-pointer btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </Modal>
        )}

        {showDeleteModal && selectedUser && (
          <Modal onClose={() => setShowDeleteModal(false)}>
            <h2 className="modal-title text-red-500">Eliminar Usuario</h2>

            <p className="my-4 text-gray-700 dark:text-gray-300">
              Para eliminar a <b>{selectedUser.name}</b> debes confirmar tu contraseña.
            </p>

            <input
              type="password"
              placeholder="Tu contraseña"
              className="modal-input"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
            />

            {deleteError && (
              <p className="text-red-500 text-sm mt-1">{deleteError}</p>
            )}

            <div className="modal-buttons mt-4">
              <button onClick={handleDelete} className="cursor-pointer btn-danger">
                Confirmar eliminación
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="cursor-pointer btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </Modal>
        )}

      </main>
    </div>
  );
}

/* -------------------- MODAL -------------------- */

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 px-4">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-md shadow-xl relative">
        <button className="cursor-pointer absolute right-4 top-3 text-xl text-gray-600 dark:text-gray-300" onClick={onClose}>
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
