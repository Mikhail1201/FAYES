import admin from "firebase-admin";
import { getApps } from "firebase-admin/app";

/* ---------------------------------------------
   🔥 Inicializar Firebase Admin una sola vez
----------------------------------------------*/
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/* ---------------------------------------------
   🔓 Validar token (usuarios, admins, superadmins)
----------------------------------------------*/
async function verifyUser(req) {
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;

  if (!idToken)
    return { error: "Missing Authorization header", status: 401 };

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    const role = userDoc.exists ? userDoc.data().role : null;

    if (!role)
      return { error: "User not registered in Firestore", status: 403 };

    return {
      uid,
      role,
      email: userDoc.data().email,
    };
  } catch (e) {
    return { error: "Invalid or expired token", status: 401 };
  }
}

/* ------------------------------------------
   🛡 VALIDACIÓN ROBUSTA DE STOCK (Opción B)
-------------------------------------------*/
function validateStockInput(data) {
  if (typeof data !== "object" || data === null) {
    return "Datos inválidos.";
  }

  const { productId, quantity } = data;

  if (!productId || typeof productId !== "string" || productId.trim() === "") {
    return "ID de producto inválido.";
  }

  if (quantity === undefined || quantity === null) {
    return "Cantidad no proporcionada.";
  }

  const qtyNum = Number(quantity);
  if (isNaN(qtyNum)) return "Cantidad debe ser un número.";
  if (!Number.isInteger(qtyNum)) return "Cantidad debe ser entera.";
  if (qtyNum < 0) return "Cantidad no puede ser negativa.";
  if (qtyNum > 999999) return "Cantidad demasiado alta.";

  return null;
}

async function validateProductExists(productId) {
  const snap = await db.collection("products").doc(productId).get();
  return snap.exists;
}

/* --------------------------------------------------
   📌 GET – Obtener todo el stock
   Acceso: todos los roles (user, admin, superadmin)
---------------------------------------------------*/
export async function GET(req) {
  const auth = await verifyUser(req);
  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const snapshot = await db.collection("stock").get();

    const stockList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return new Response(JSON.stringify(stockList), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

/* --------------------------------------------------
   📌 POST – Crear stock
   Acceso: todos los roles
---------------------------------------------------*/
export async function POST(req) {
  const auth = await verifyUser(req);
  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const body = await req.json();
    const errorMsg = validateStockInput(body);

    if (errorMsg)
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400,
      });

    const { productId, quantity } = body;

    const exists = await validateProductExists(productId);
    if (!exists)
      return new Response(
        JSON.stringify({ error: "El producto no existe." }),
        { status: 400 }
      );

    await db.collection("stock").doc(productId).set({
      quantity,
      createdAt: admin.firestore.Timestamp.now(),
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}

/* --------------------------------------------------
   📌 PUT – Actualizar stock
   Acceso: todos los roles
---------------------------------------------------*/
export async function PUT(req) {
  const auth = await verifyUser(req);
  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const body = await req.json();
    const errorMsg = validateStockInput(body);

    if (errorMsg)
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400,
      });

    const { productId, quantity } = body;

    const exists = await validateProductExists(productId);
    if (!exists)
      return new Response(
        JSON.stringify({ error: "El producto no existe." }),
        { status: 400 }
      );

    await db.collection("stock").doc(productId).update({
      quantity,
      createdAt: admin.firestore.Timestamp.now(),
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}

/* --------------------------------------------------
   📌 DELETE – Eliminar stock
   Acceso: todos los roles
---------------------------------------------------*/
export async function DELETE(req) {
  const auth = await verifyUser(req);
  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const { productId } = await req.json();

    if (!productId)
      return new Response(
        JSON.stringify({ error: "Missing productId" }),
        { status: 400 }
      );

    const exists = await validateProductExists(productId);
    if (!exists)
      return new Response(
        JSON.stringify({ error: "El producto no existe." }),
        { status: 400 }
      );

    await db.collection("stock").doc(productId).delete();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}
/* --------------------------------------------------
   📌 PATCH – Incrementar stock o pedir al frontend crear el producto.
      - Busca productos por su *nombre* (no ID)
---------------------------------------------------*/
export async function PATCH(req) {
  const auth = await verifyUser(req);
  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const { productName } = await req.json();

    if (!productName)
      return new Response(
        JSON.stringify({ error: "Missing productName" }),
        { status: 400 }
      );

    // --- Buscar por NOMBRE (no ID) ---
    const productsRef = db.collection("products");
    const querySnap = await productsRef
      .where("name", "==", productName)
      .limit(1)
      .get();

    if (querySnap.empty) {
      // Producto NO existe → el frontend debe pedir el precio para crearlo
      return new Response(
        JSON.stringify({
          success: false,
          needsPrice: true,
          productName,
        }),
        { status: 200 }
      );
    }

    // Producto existe → obtener ID real
    const productDoc = querySnap.docs[0];
    const productId = productDoc.id;

    // Stock reference
    const stockRef = db.collection("stock").doc(productId);
    const stockSnap = await stockRef.get();

    if (!stockSnap.exists) {
      // Si no hay stock registrado todavía → crear quantity=1
      await stockRef.set({
        quantity: 1,
        createdAt: admin.firestore.Timestamp.now(),
      });
    } else {
      const current = stockSnap.data().quantity || 0;
      await stockRef.update({
        quantity: current + 1,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        incremented: true,
        productId,
        productName,
      }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}
