import { spawn } from "child_process";
import path from "path";

export async function POST(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), {
      status: 401,
    });
  }

  // Ruta absoluta del script Python
  const scriptPath = path.join(process.cwd(), "python", "main.py");

  console.log("[RUNNING]", scriptPath);

  // ✔ En Windows usa "python"
  // ✔ En Linux/Mac usa "python3"
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  // Ejecutar script Python con token como argumento
  const processPy = spawn(pythonCmd, [scriptPath, token]);

  processPy.stdout.on("data", (data) => {
    console.log("📤 PYTHON:", data.toString());
  });

  processPy.stderr.on("data", (data) => {
    console.error("⚠ PYTHON ERROR:", data.toString());
  });

  processPy.on("close", (code) => {
    console.log("✔ Python finalizó con código:", code);
  });

  return new Response(JSON.stringify({ started: true }), { status: 200 });
}
