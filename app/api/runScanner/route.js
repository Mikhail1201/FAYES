import { exec } from "child_process";
import path from "path";

export async function POST(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), { status: 401 });
  }

  // Ruta absoluta al script Python
  const scriptPath = path.join(process.cwd(), "python", "main.py");

  console.log("[RUNNING]", scriptPath);

  // Ejecutar Python con el JWT como argumento
  exec(`python3 "${scriptPath}" "${token}"`, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Error ejecutando Python:", err);
    }
    if (stderr) {
      console.error("⚠ Python STDERR:", stderr);
    }
    console.log("📤 PYTHON OUTPUT:", stdout);
  });

  return new Response(JSON.stringify({ started: true }), { status: 200 });
}
