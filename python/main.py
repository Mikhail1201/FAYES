import sys

# -------------------------------------
# 🔵 LEER JWT QUE VIENE DESDE NEXT.JS
# -------------------------------------
if len(sys.argv) < 2:
    print("[ERROR] No se recibió JWT como argumento.")
    exit(1)

SESSION_JWT = sys.argv[1]
print("[INFO] JWT recibido correctamente:", SESSION_JWT)
# -------------------------------------
import cv2
import requests
import time
import numpy as np
import re
from ultralytics import YOLO

ESP32_URL = "http://192.168.80.36:81/capture"
DELAY_SECONDS = 10

BACKEND_URL = "http://fayes-iota.vercel.app/api/handleInventory"   # <-- tu endpoint PATCH real

model = YOLO("../models/best.pt")

# --------------------------------------------------
# 🔵 Diccionario de normalización flexible
# --------------------------------------------------
NORMALIZER = {
    "apple": "manzana",
    "banana": "banana",
    "orange": "naranja",
    "mango": "mango"
}

def normalize_label(label: str):
    """
    Convierte cosas como:
    rottenApple, FreshAPPLE, ROTTENapple → apple
    fresh_mango, Rotten-Mango → mango
    """
    label = label.lower()

    # quitar palabras "fresh", "rotten", "good", etc
    label = re.sub(r"(fresh|rotten|overripe|unripe|bad|good)", "", label)

    # eliminar guiones, espacios, underscores
    label = re.sub(r"[^a-zA-Z]", "", label)

    # ahora buscar coincidencia
    for key in NORMALIZER:
        if key in label:
            return NORMALIZER[key]

    return None


# --------------------------------------------------
# 🔵 Función para conectar al ESP32 con reintento
# --------------------------------------------------
def connect_stream():
    print("[INFO] Conectando al ESP32...")
    try:
        s = requests.get(ESP32_URL, stream=True, timeout=5)
        if s.status_code == 200:
            print("[INFO] Conectado exitosamente.")
            return s
        else:
            print("[ERROR] Estado HTTP:", s.status_code)
            return None
    except Exception as e:
        print("[ERROR] Fallo al conectar:", e)
        return None


# --------------------------------------------------
# 🔵 Enviar actualización al backend
# --------------------------------------------------
def send_to_backend(normalized_name):
    print(f"[PATCH] Enviando '{normalized_name}' al backend...")

    body = {
        "productName": normalized_name
    }

    headers = {
        "Authorization": f"Bearer {SESSION_JWT}",
        "Content-Type": "application/json"
    }

    try:
        r = requests.patch(BACKEND_URL, json=body, headers=headers)
        print("[RESPUESTA BACKEND]", r.status_code, r.text)
    except Exception as e:
        print("[ERROR] No se pudo enviar PATCH:", e)


# --------------------------------------------------
# 🔴 LOOP PRINCIPAL CON RECONEXIÓN AUTOMÁTICA
# --------------------------------------------------
while True:
    stream = connect_stream()
    if not stream:
        print("[INFO] Reintentando en 3s...")
        time.sleep(3)
        continue

    bytes_buffer = bytes()
    last_time = time.time()

    try:
        for chunk in stream.iter_content(chunk_size=1024):

            bytes_buffer += chunk
            a = bytes_buffer.find(b'\xff\xd8')
            b = bytes_buffer.find(b'\xff\xd9')

            if a != -1 and b != -1:
                jpg = bytes_buffer[a:b+2]
                bytes_buffer = bytes_buffer[b+2:]

                img = cv2.imdecode(np.frombuffer(jpg, np.uint8), cv2.IMREAD_COLOR)
                if img is None:
                    continue

                cv2.imshow("ESP32-CAM", img)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    raise KeyboardInterrupt()

                # limitar procesamiento
                if time.time() - last_time < DELAY_SECONDS:
                    continue
                last_time = time.time()

                # inferencia
                results = model(img, conf=0.6)

                if len(results[0].boxes) == 0:
                    print("No se detectó ninguna fruta")
                    continue

                # obtener detección más confiable
                best_box = max(results[0].boxes, key=lambda x: float(x.conf[0]))
                cls_id = int(best_box.cls[0])
                raw_label = model.names[cls_id]

                print(f"[YOLO] Detectado: {raw_label}")

                normalized = normalize_label(raw_label)

                if normalized is None:
                    print("[WARNING] No puedo mapear esta fruta:", raw_label)
                    continue

                print(f"[NORMALIZADO] {raw_label} → {normalized}")

                send_to_backend(normalized)

    except (requests.exceptions.ChunkedEncodingError,
            requests.exceptions.ConnectionError,
            requests.exceptions.ReadTimeout):
        print("[WARN] Stream roto. Reconectando en 2s...\n")
        time.sleep(2)
        continue

    except KeyboardInterrupt:
        print("\nSaliendo...")
        break

cv2.destroyAllWindows()
