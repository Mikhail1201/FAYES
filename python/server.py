from flask import Flask, request, jsonify
import subprocess
import threading
import signal
import os

app = Flask(__name__)
python_process = None  # variable global

@app.post("/scanner/start")
def start_scanner():
    global python_process

    token = request.json.get("token")
    if not token:
        return jsonify({"error": "Missing token"}), 400

    if python_process:
        return jsonify({"error": "Scanner ya está en ejecución"}), 400

    # Ejecuta main.py
    python_process = subprocess.Popen(
        ["python3", "main.py", token],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    return jsonify({"started": True})


@app.post("/scanner/stop")
def stop_scanner():
    global python_process

    if not python_process:
        return jsonify({"error": "No hay scanner activo"}), 400

    python_process.terminate()
    python_process = None

    return jsonify({"stopped": True})


@app.get("/")
def home():
    return {"status": "Python server running"}
