import { spawn } from "child_process";
import path from "path";

let pythonProcess = null; // ← Proceso global

export async function POST(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), {
      status: 401,
    });
  }

  // Leer JSON del body para saber si es start o stop
  let body = {};
  try {
    body = await req.json();
  } catch {}

  const action = body.action || "start";

  // Ruta absoluta del script Python
  const scriptPath = path.join(process.cwd(), "python", "main.py");

  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  /* ------------------ STOP ------------------ */
  if (action === "stop") {
    if (pythonProcess) {
      console.log("🛑 Terminando proceso Python...");

      pythonProcess.kill("SIGTERM");
      pythonProcess = null;

      return new Response(JSON.stringify({ stopped: true }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: "No hay proceso activo" }), {
        status: 400,
      });
    }
  }

  /* ------------------ START ------------------ */
  console.log("[RUNNING]", scriptPath);

  pythonProcess = spawn(pythonCmd, [scriptPath, token]);

  pythonProcess.stdout.on("data", (data) => {
    console.log("📤 PYTHON:", data.toString());
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error("⚠ PYTHON ERROR:", data.toString());
  });

  pythonProcess.on("close", (code) => {
    console.log("✔ Python finalizó con código:", code);
    pythonProcess = null; // liberar referencia
  });

  return new Response(JSON.stringify({ started: true }), { status: 200 });
}
