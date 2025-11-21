import admin from "firebase-admin";
import { getApps } from "firebase-admin/app";

// Inicializar Firebase Admin una sola vez
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/* ---------------------------------------------
   🔓 verifyUser → permite usuario, admin, superadmin
----------------------------------------------*/
async function verifyUser(req) {
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;

  if (!idToken) return { error: "Missing Authorization header", status: 401 };

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;

    if (!["user", "admin", "superadmin"].includes(userRole)) {
      return { error: "Forbidden: Invalid role", status: 403 };
    }

    return { uid, role: userRole, email: userDoc.data().email };
  } catch (e) {
    return { error: "Invalid or expired token", status: 401 };
  }
}

/* ---------------------------------------------
   🔒 verifyAdmin → SOLO admin y superadmin
----------------------------------------------*/
async function verifyAdmin(req) {
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;

  if (!idToken) return { error: "Missing Authorization header", status: 401 };

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const adminUid = decoded.uid;

    const adminDoc = await db.collection("users").doc(adminUid).get();
    const adminRole = adminDoc.exists ? adminDoc.data().role : null;

    if (adminRole !== "admin" && adminRole !== "superadmin") {
      return { error: "Forbidden: Insufficient permissions", status: 403 };
    }

    return { uid: adminUid, role: adminRole, email: adminDoc.data().email };
  } catch (e) {
    return { error: "Invalid or expired token", status: 401 };
  }
}

/* --------------------------------------------------
   📌 1. GET – Obtener todos los productos (usuario/admin/superadmin)
---------------------------------------------------*/
export async function GET(req) {
  const auth = await verifyUser(req); // ← Se permite usuario normal

  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const snapshot = await db.collection("products").get();
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return new Response(JSON.stringify(products), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

/* --------------------------------------------------
   📌 2. POST – Crear producto (usuario/admin/superadmin)
---------------------------------------------------*/
export async function POST(req) {
  const auth = await verifyUser(req); // ← CAMBIO

  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const { name } = await req.json();

    if (!name) {
      return new Response(JSON.stringify({ error: "Missing name field" }), {
        status: 400,
      });
    }

    const ref = await db.collection("products").add({
      name,
      createdAt: admin.firestore.Timestamp.now(),
    });

    await db.collection("logs").add({
      action: "crear",
      details: `Producto '${name}' creado`,
      timestamp: new Date(),
      performedBy: auth.email,
    });

    return new Response(JSON.stringify({ success: true, id: ref.id }), {
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}

/* --------------------------------------------------
   📌 3. PUT – Actualizar producto (usuario/admin/superadmin)
---------------------------------------------------*/
export async function PUT(req) {
  const auth = await verifyUser(req); // ← CAMBIO

  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const { id, name } = await req.json();

    if (!id || !name) {
      return new Response(
        JSON.stringify({ error: "Missing id or name field" }),
        { status: 400 }
      );
    }

    await db.collection("products").doc(id).update({ name });

    await db.collection("logs").add({
      action: "actualizar",
      details: `Producto '${name}' actualizado`,
      timestamp: new Date(),
      performedBy: auth.email,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}

/* --------------------------------------------------
   📌 4. DELETE – Eliminar producto (solo admin/superadmin)
---------------------------------------------------*/
export async function DELETE(req) {
  const auth = await verifyAdmin(req); // ← SOLO admin/superadmin

  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const { id } = await req.json();

    if (!id)
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
      });

    await db.collection("products").doc(id).delete();

    await db.collection("logs").add({
      action: "eliminar",
      details: `Producto con ID '${id}' eliminado`,
      timestamp: new Date(),
      performedBy: auth.email,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}
