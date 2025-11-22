"use client";

import { useEffect, useState, FormEvent, ReactNode } from "react";
import { auth } from "../firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

import Sidebar from "../../components/Sidebar";
import ThemeSwitch from "../../components/ThemeSwitch";

// 🔥 MENSAJES
import ErrorDiv from "../../components/ErrorDiv";
import SuccessDiv from "../../components/SuccessDiv";

/* ------------------------ API HELPERS ------------------------ */

async function fetchProducts() {
  const token = await auth.currentUser?.getIdToken();

  const res = await fetch("/api/handleProducts", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  try {
    return await res.json();
  } catch {
    return [];
  }
}

async function createProduct(data: any) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/handleProducts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return await res.json();
}

async function updateProduct(id: string, data: any) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/handleProducts", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id, ...data }),
  });

  return await res.json();
}

async function deleteProduct(id: string) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/handleProducts", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id }),
  });

  return await res.json();
}

/* ----------------------------- PAGE START ----------------------------- */

export default function ProductosPage() {
  const router = useRouter();

  type Product = {
    id: string;
    name: string;
    price: number;
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Delete password confirmation
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // ERROR / SUCCESS
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Auth / Role Check
  const [user, loading] = useAuthState(auth);
  const [roleChecked, setRoleChecked] = useState(false);

  /* Load products */
  const loadProducts = async () => {
    const data = await fetchProducts();
    setProducts(data);
  };

  /* AUTH */
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  /* ROLE CHECK */
  useEffect(() => {
    const verifyRole = async () => {
      if (!user) return;

      const db = getFirestore();
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : {};
      const role = data.role || "";

      if (role !== "admin" && role !== "superadmin") {
        router.push("/");
        return;
      }

      await loadProducts();
      setRoleChecked(true);
    };

    verifyRole();
  }, [user]);

  if (loading || !user || !roleChecked) return null;

  /* -------------------------- DELETE HANDLER -------------------------- */

  const handleDelete = async () => {
    if (!selectedProduct) return;

    setDeleteError("");
    setError("");

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

      const res = await deleteProduct(selectedProduct.id);

      if (res.error) {
        setError(res.error);
        return;
      }

      setSuccess("Producto eliminado correctamente.");
      setShowDeleteModal(false);
      setSelectedProduct(null);
      setDeletePassword("");

      loadProducts();

    } catch {
      setError("Contraseña incorrecta.");
    }
  };

  /* ----------------------------- RENDER ----------------------------- */

  return (
    <div className="min-h-screen bg-[#e8ebf2] dark:bg-[#0e0e12] flex">

      {/* 🔥 NOTIFICACIONES */}
      <div className="z-51">
        <ErrorDiv message={error} onClose={() => setError("")} />
        <SuccessDiv message={success} onClose={() => setSuccess("")} />
      </div>

      {/* SIDEBAR */}
      <Sidebar onLogout={() => auth.signOut()} />

      <main className="flex-1 p-5 sm:p-10 flex flex-col lg:flex-row gap-10 relative">

        {/* LEFT: ACTION BUTTONS */}
        <div className="flex flex-col gap-6 w-full lg:w-1/2">
          <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
            Administrar Productos
          </h1>

          <button
            onClick={() => setShowAddModal(true)}
            className="cursor-pointer w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xl font-semibold transition"
          >
            Añadir Producto
          </button>

          <button
            onClick={() => selectedProduct && setShowUpdateModal(true)}
            disabled={!selectedProduct}
            className="cursor-pointer w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xl font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Actualizar Producto
          </button>

          <button
            onClick={() => selectedProduct && setShowDeleteModal(true)}
            disabled={!selectedProduct}
            className="cursor-pointer w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xl font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Eliminar Producto
          </button>

          {selectedProduct && (
            <div className="text-gray-700 dark:text-gray-300 mt-4 p-4 bg-white/50 dark:bg-white/10 rounded-lg">
              <p><b>Producto seleccionado:</b></p>
              <p className="mt-2">Nombre: {selectedProduct.name}</p>
              <p>Precio: ${selectedProduct.price.toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* RIGHT: PRODUCT LIST */}
        <div className="w-full lg:w-1/2 bg-white/70 dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 max-h-[80vh] overflow-auto">

          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Lista de Productos
          </h2>

          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-200/70 dark:bg-gray-700/40 text-sm">
                <th className="p-3">Nombre</th>
                <th className="p-3">Precio</th>
              </tr>
            </thead>

            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/40 transition ${
                    selectedProduct?.id === p.id ? "bg-gray-300 dark:bg-gray-800" : ""
                  }`}
                >
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">${p.price ? p.price.toFixed(2) : "0.00"}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>

        <div className="absolute-top-6 absolute-right-6">
          <ThemeSwitch />
        </div>
      </main>

      {/* ------------------------- MODALS ------------------------- */}

      {/* ADD MODAL */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
            Añadir Producto
          </h2>

          <form
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const form = new FormData(e.target as HTMLFormElement);

              const res = await createProduct({
                name: form.get("name"),
                price: form.get("price"),
              });

              if (res.error) {
                setError(res.error);
                return;
              }

              setSuccess("Producto creado correctamente.");
              setShowAddModal(false);
              loadProducts();
            }}
            className="flex flex-col gap-3"
          >
            <input 
              name="name" 
              placeholder="Nombre del producto" 
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" 
              required 
            />

            <input 
              name="price" 
              type="number" 
              step="0.01"
              min="0"
              placeholder="Precio" 
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" 
              required 
            />

            <div className="flex gap-3 mt-2">
              <button className="cursor-pointer flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition">
                Crear
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)} 
                className="cursor-pointer flex-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* UPDATE MODAL */}
      {showUpdateModal && selectedProduct && (
        <Modal onClose={() => setShowUpdateModal(false)}>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
            Actualizar Producto
          </h2>

          <form
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const form = new FormData(e.target as HTMLFormElement);

              const res = await updateProduct(selectedProduct.id, {
                name: form.get("name"),
                price: form.get("price"),
              });

              if (res.error) {
                setError(res.error);
                return;
              }

              setSuccess("Producto actualizado correctamente.");
              setShowUpdateModal(false);
              setSelectedProduct(null);
              loadProducts();
            }}
            className="flex flex-col gap-3"
          >
            <input 
              name="name" 
              defaultValue={selectedProduct.name} 
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" 
              required 
            />

            <input 
              name="price" 
              type="number" 
              step="0.01"
              min="0"
              defaultValue={selectedProduct.price}
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" 
              required 
            />

            <div className="flex gap-3 mt-2">
              <button className="cursor-pointer flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition">
                Guardar
              </button>
              <button 
                type="button" 
                onClick={() => setShowUpdateModal(false)} 
                className="cursor-pointer flex-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && selectedProduct && (
        <Modal onClose={() => {
          setShowDeleteModal(false);
          setDeletePassword("");
          setDeleteError("");
        }}>
          <h2 className="text-2xl font-semibold text-red-500 mb-4">
            Eliminar Producto
          </h2>

          <p className="my-4 text-gray-700 dark:text-gray-300">
            Para eliminar <b>{selectedProduct.name}</b> (${selectedProduct.price.toFixed(2)}) confirma tu contraseña.
          </p>

          <input
            type="password"
            placeholder="Tu contraseña"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 mb-2"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            required
          />

          {deleteError && (
            <p className="text-red-500 text-sm mb-3">{deleteError}</p>
          )}

          <div className="flex gap-3 mt-4">
            <button 
              onClick={handleDelete} 
              className="cursor-pointer flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition"
            >
              Confirmar eliminación
            </button>

            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletePassword("");
                setDeleteError("");
              }}
              className="cursor-pointer flex-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}

/* -------------------- MODAL -------------------- */

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 px-4">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-md shadow-xl relative">
        <button
          className="cursor-pointer absolute right-4 top-3 text-xl text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
          onClick={onClose}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}