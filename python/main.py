import cv2
import requests
import time
import numpy as np
from ultralytics import YOLO

ESP32_URL = "http://192.168.4.1:81/stream"  # <-- Cambia la IP
DELAY_SECONDS = 1
model = YOLO("../train5/weights/best.pt")

print("[INFO] Conectando al ESP32-CAM...")

stream = requests.get(ESP32_URL, stream=True)

if stream.status_code != 200:
    print("[ERROR] No se pudo acceder al stream del ESP32.")
    exit()

bytes_buffer = bytes()
last_time = time.time()

print("[INFO] Conectado exitosamente. Iniciando detección...")

for chunk in stream.iter_content(chunk_size=1024):
    bytes_buffer += chunk
    a = bytes_buffer.find(b'\xff\xd8')
    b = bytes_buffer.find(b'\xff\xd9')

    if a != -1 and b != -1:
        jpg = bytes_buffer[a:b+2]
        bytes_buffer = bytes_buffer[b+2:]

        img = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)

        if time.time() - last_time < DELAY_SECONDS:
            continue

        last_time = time.time()

        results = model(img, conf=0.6)

        if len(results[0].boxes) == 0:
            print("No se detectó ninguna fruta")
            continue

        best_box = max(results[0].boxes, key=lambda x: float(x.conf[0]))
        cls_id = int(best_box.cls[0])
        fruit_name = model.names[cls_id]

        print(f"[DETECTADO] {fruit_name}")
