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
   🔒 Validar token + rol (admin o superadmin)
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
   📌 1. GET – Obtener todos los usuarios
---------------------------------------------------*/
export async function GET(req) {
  const auth = await verifyAdmin(req);

  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return new Response(JSON.stringify(users), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

/* --------------------------------------------------
   📌 2. POST – Crear usuario (Auth + Firestore)
---------------------------------------------------*/
export async function POST(req) {
  const auth = await verifyAdmin(req);

  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    // Prevención: solo superadmin crea superadmin
    if (role === "superadmin" && auth.role !== "superadmin") {
      return new Response(
        JSON.stringify({
          error: "Only superadmin can create another superadmin",
        }),
        { status: 403 }
      );
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      role,
      createdAt: admin.firestore.Timestamp.now(),
    });

    await db.collection("logs").add({
      action: "crear",
      details: `Usuario '${name}' creado con rol '${role}'`,
      timestamp: new Date(),
      performedBy: auth.email,
    });

    return new Response(
      JSON.stringify({ success: true, uid: userRecord.uid }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}

/* --------------------------------------------------
   📌 3. PUT – Actualizar usuario (Auth + Firestore)
---------------------------------------------------*/
export async function PUT(req) {
  const auth = await verifyAdmin(req);

  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const { uid, name, role, password } = await req.json();

    if (!uid || !name || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    // No permitir asignar superadmin si no es superadmin
    if (role === "superadmin" && auth.role !== "superadmin") {
      return new Response(
        JSON.stringify({
          error: "Only superadmin can assign superadmin role",
        }),
        { status: 403 }
      );
    }

    // Construir datos para AUTH
    const updateData = { displayName: name };
    if (password && password.trim() !== "") {
      updateData.password = password;
    }

    // Actualizar AUTH
    await admin.auth().updateUser(uid, updateData);

    // Actualizar Firestore
    await db.collection("users").doc(uid).update({
      name,
      role,
    });

    // Registrar en logs
    await db.collection("logs").add({
      action: "actualizar",
      details: `Usuario '${name}' actualizado (rol: ${role})`,
      timestamp: new Date(),
      performedBy: auth.email,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}

/* --------------------------------------------------
   📌 4. DELETE – Eliminar (Auth + Firestore)
---------------------------------------------------*/
export async function DELETE(req) {
  const auth = await verifyAdmin(req);

  if (auth.error)
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
    });

  try {
    const { uid } = await req.json();
    if (!uid)
      return new Response(JSON.stringify({ error: "Missing uid" }), {
        status: 400,
      });

    await admin.auth().deleteUser(uid);
    await db.collection("users").doc(uid).delete();

    await db.collection("logs").add({
      action: "eliminar",
      details: `Usuario con UID '${uid}' eliminado`,
      timestamp: new Date(),
      performedBy: auth.email,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}
