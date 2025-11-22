"use client";

import { useEffect, useState, useRef, MouseEvent, FormEvent, ReactNode } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import Sidebar from "../../components/Sidebar";
import ThemeSwitch from "../../components/ThemeSwitch";
import ErrorDiv from "../../components/ErrorDiv";
import SuccessDiv from "../../components/SuccessDiv";

import { Trash } from "lucide-react";

/* ------------------------ UTIL API METHODS ------------------------ */

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

async function createStock(productId: string, quantity: number) {
  const token = await auth.currentUser?.getIdToken();

  const res = await fetch("/api/handleInventory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, quantity }),
  });

  return res.ok;
}

async function updateStock(productId: string, quantity: number) {
  const token = await auth.currentUser?.getIdToken();

  const res = await fetch("/api/handleInventory", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, quantity }),
  });

  return res.ok;
}

async function deleteStock(productId: string) {
  const token = await auth.currentUser?.getIdToken();

  const res = await fetch("/api/handleInventory", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId }),
  });

  return res.ok;
}

/* ----------------------------- PAGE START ----------------------------- */

export default function InventarioPage() {
  const router = useRouter();

  type Product = {
    id: string;
    name: string;
    price: number;
  };

  type StockItem = {
    id: string;
    quantity: number;
    createdAt?: any;
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [localQuantities, setLocalQuantities] = useState<{ [key: string]: number }>({});

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const tableRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);

  /* ----- AUTH & ROLE CHECK ----- */
  const [user, loading] = useAuthState(auth);
  const [roleChecked, setRoleChecked] = useState(false);
  const [userRole, setUserRole] = useState("");

  /* ------------------------ LOAD DATA FUNCTIONS ------------------------ */
  const loadProducts = async () => {
    const data = await fetchProducts();
    setProducts(data);
  };

  const loadStock = async () => {
    const data = await fetchStock();
    
    // Inicializar cantidades locales
    const qtyMap: any = {};
    data.forEach((s: StockItem) => (qtyMap[s.id] = s.quantity));

    setLocalQuantities(qtyMap);
    setStock(data);
  };

  const loadData = async () => {
    await Promise.all([loadProducts(), loadStock()]);
  };

  /* ------------------------ AUTH & LOAD DATA ------------------------ */
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

      // Verificar que el usuario tenga un rol válido
      if (!["user", "admin", "superadmin"].includes(role)) {
        router.push("/");
        return;
      }

      await loadData();
      setRoleChecked(true);
    };

    verifyRole();
  }, [user]);

  if (loading || !user || !roleChecked) return null;

  /* ------------------------ TABLE ACTIONS ------------------------ */

  const handleQtyChange = (productId: string, delta: number) => {
    setLocalQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta),
    }));
  };

  const handleSaveStock = async (productId: string) => {
    const qty = localQuantities[productId];

    const success = await updateStock(productId, qty);
    
    if (success) {
      setSuccess("Stock actualizado correctamente.");
      await loadStock();
    } else {
      setError("Error al actualizar el stock.");
    }
  };

  const handleRowClick = (e: MouseEvent<HTMLTableRowElement>, item: StockItem) => {
    const tableEl = tableRef.current;
    if (!tableEl) return;

    setMenuPos({ x: e.clientX + 5, y: e.clientY + 5 });
    setSelectedProduct(item);
    setShowMenu(true);
  };

  /* ------------------------ CREATE STOCK ------------------------ */

  const handleCreateStock = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);

    const productId = form.get("productId") as string;
    const qty = Number(form.get("quantity"));

    const success = await createStock(productId, qty);

    if (success) {
      setSuccess("Stock creado correctamente.");
      setShowCreateModal(false);
      await loadStock();
    } else {
      setError("Error al crear el stock.");
    }
  };

  /* ------------------------ DELETE STOCK ------------------------ */

  const handleDelete = async () => {
    if (!selectedProduct) return;

    setDeleteError("");

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("No hay usuario autenticado.");
      return;
    }

    try {
      // Reautenticar al usuario con su contraseña
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        deletePassword
      );

      await reauthenticateWithCredential(currentUser, credential);

      // Si la contraseña es correcta, proceder con la eliminación
      const success = await deleteStock(selectedProduct.id);

      if (success) {
        setSuccess("Stock eliminado correctamente.");
        setShowDeleteModal(false);
        setShowMenu(false);
        setDeletePassword("");
        await loadStock();
      } else {
        setError("Error al eliminar el stock.");
      }
    } catch (err) {
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

      <Sidebar onLogout={() => auth.signOut()} />

      <main className="flex-1 p-5 sm:p-10">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-100">
            Inventario
          </h1>
          <ThemeSwitch />
        </div>

        {/* TABLE */}
        <div ref={tableRef} className="bg-white/70 dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl overflow-x-auto p-4 sm:p-6">

          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="bg-gray-200/70 dark:bg-gray-700/40">
                <th className="p-3 text-center">Producto</th>
                <th className="p-3 text-center">Precio</th>
                <th className="p-3 text-center">Cantidad</th>
                <th className="p-3">Guardar</th>
              </tr>
            </thead>

            <tbody>
              {stock.map((item) => {
                const product = products.find((p) => p.id === item.id);
                const localQty = localQuantities[item.id];
                const changed = localQty !== item.quantity;

                return (
                  <tr
                    key={item.id}
                    onClick={(e) => handleRowClick(e, item)}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/40 transition"
                  >
                    <td className="p-3 text-center">{product?.name || "(Producto eliminado)"}</td>

                    {/* Precio vacío por ahora */}
                    <td className="p-3 text-center">{product?.price || "Sin precio"}</td>

                    <td className="p-3 text-center flex justify-center items-center">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleQtyChange(item.id, -1); 
                          }}
                          className="cursor-pointer px-3 py-1 bg-gray-300 dark:bg-gray-700 rounded-lg text-lg hover:bg-gray-400 dark:hover:bg-gray-600"
                        >
                          -
                        </button>

                        <span className="w-10 text-center font-semibold">{localQty}</span>

                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleQtyChange(item.id, 1); 
                          }}
                          className="cursor-pointer px-3 py-1 bg-gray-300 dark:bg-gray-700 rounded-lg text-lg hover:bg-gray-400 dark:hover:bg-gray-600"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    <td className="p-3">
                      {changed && (
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleSaveStock(item.id); 
                          }}
                          className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition"
                        >
                          Guardar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Crear nuevo stock */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="cursor-pointer w-full mt-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xl font-semibold transition"
          >
            +
          </button>
        </div>

        {/* POPUP MENU */}
        {showMenu && (
          <div
            className="absolute bg-white dark:bg-gray-800 shadow-xl rounded-lg p-2 z-50 w-40 border border-gray-300 dark:border-gray-700"
            style={{ top: menuPos.y, left: menuPos.x }}
            onMouseLeave={() => setShowMenu(false)}
          >
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

        {/* MODAL CREAR STOCK */}
        {showCreateModal && (
          <Modal onClose={() => setShowCreateModal(false)}>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
              Crear Stock
            </h2>

            <form onSubmit={handleCreateStock} className="flex flex-col gap-3">
              <select 
                name="productId" 
                className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 cursor-pointer" 
                required
              >
                <option value="">Seleccionar producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <input
                name="quantity"
                type="number"
                min="0"
                placeholder="Cantidad inicial"
                className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                required
              />

              <div className="flex gap-3 mt-2">
                <button 
                  type="submit"
                  className="cursor-pointer flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition"
                >
                  Crear
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="cursor-pointer flex-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL ELIMINAR */}
        {showDeleteModal && selectedProduct && (
          <Modal onClose={() => {
            setShowDeleteModal(false);
            setDeletePassword("");
            setDeleteError("");
          }}>
            <h2 className="text-2xl font-semibold text-red-500 mb-4">
              Eliminar Stock
            </h2>

            <p className="my-4 text-gray-700 dark:text-gray-300">
              Para eliminar el stock de este producto, debes confirmar tu contraseña.
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

      </main>
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