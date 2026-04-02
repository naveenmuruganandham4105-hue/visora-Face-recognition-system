import os
import cv2
import numpy as np
from PIL import Image
import base64
import json
from datetime import datetime
import csv
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Enable CORS so our React dev server can speak to this API
CORS(app)

dataset_path = 'dataset'
names_file = 'names.json'
trainer_file = 'trainer.yml'
log_file = 'predictions_log.csv'

# Haarcascade setup
cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
face_cascade = cv2.CascadeClassifier(cascade_path)

names_dict = {}
# Swapped rigorously to LBPH for drastically superior tolerance to webcam misalignment/cropping
recognizer = cv2.face.LBPHFaceRecognizer_create()
model_loaded = False

def load_model():
    """Load the model and namings if they already exist on disk."""
    global names_dict, model_loaded
    if os.path.exists(names_file) and os.path.exists(trainer_file):
        try:
            with open(names_file, 'r') as f:
                names_dict = json.load(f)
            recognizer.read(trainer_file)
            model_loaded = True
            print("LBPH Model loaded successfully into backend.")
        except Exception as e:
            print("Failed to load model. It may be the old FisherFaces format. You must Retrain the model. Error:", e)

load_model()

def decode_base64_img(base64_string):
    """Utility to decode base64 images from browser canvas into CV2 numpy arrays."""
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

@app.route('/api/enroll', methods=['POST'])
def enroll():
    data = request.json
    name = data.get('name')
    frame_b64 = data.get('frame')
    count = data.get('count', 0)
    
    if not name or not frame_b64:
        return jsonify({"success": False, "error": "Missing name or frame string."})

    dataset_dir = os.path.join(dataset_path, name)
    os.makedirs(dataset_dir, exist_ok=True)

    frame = decode_base64_img(frame_b64)
    if frame is None:
        return jsonify({"success": False, "error": "Failed to decode base64 frame."})

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=8, minSize=(100, 100))
    
    if len(faces) == 0:
        return jsonify({"success": False, "message": "No face detected in this frame."})

    (x, y, w, h) = faces[0]
    tight_x = x + int(w * 0.1)
    tight_y = y + int(h * 0.1)
    tight_w = int(w * 0.8)
    tight_h = int(h * 0.8)
    
    face_crop = gray[tight_y:tight_y+tight_h, tight_x:tight_x+tight_w]
    face_resized = cv2.resize(face_crop, (200, 200))
    # Standardize lighting
    face_resized = cv2.equalizeHist(face_resized)
    
    img_path = os.path.join(dataset_dir, f"{count}.jpg")
    cv2.imwrite(img_path, face_resized)
    
    return jsonify({
        "success": True, 
        "message": "Captured", 
        "box": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
    })

@app.route('/api/train', methods=['POST'])
def train():
    if not os.path.exists(dataset_path):
        return jsonify({"success": False, "error": "No 'dataset' directory found."})

    global names_dict, model_loaded
    names_dict = {}
    current_id = 0
    face_samples = []
    ids = []

    all_items = os.listdir(dataset_path)
    person_names = sorted([d for d in all_items if os.path.isdir(os.path.join(dataset_path, d))])
    
    for name in person_names:
        names_dict[str(current_id)] = name
        person_dir = os.path.join(dataset_path, name)
        
        for img_name in os.listdir(person_dir):
            if img_name.lower().endswith('.jpg'):
                img_path = os.path.join(person_dir, img_name)
                PIL_img = Image.open(img_path).convert('L')
                PIL_img = PIL_img.resize((200, 200))
                img_numpy = np.array(PIL_img, 'uint8')
                
                # Normalize LBPH
                img_numpy = cv2.equalizeHist(img_numpy)
                
                face_samples.append(img_numpy)
                ids.append(current_id)
        current_id += 1

    unique_persons = len(np.unique(ids))
    # LBPH ONLY REQUIRES 1 PERSON TO TRAIN UNLIKE FISHER FACES!
    if unique_persons < 1:
        return jsonify({
            "success": False, 
            "error": "You must enroll at least 1 person to train the AI model."
        })

    with open(names_file, 'w') as f:
        json.dump(names_dict, f, indent=4)
        
    global recognizer
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.train(face_samples, np.array(ids))
    recognizer.write(trainer_file)
    model_loaded = True

    return jsonify({"success": True, "message": f"Successfully trained LBPH model with {len(names_dict)} people and {len(face_samples)} total images."})

@app.route('/api/recognize', methods=['POST'])
def recognize_face():
    if not model_loaded:
        return jsonify({"success": False, "error": "Model not trained or missing."})

    data = request.json
    frame_b64 = data.get('frame')
    # LBPH uses drastically different distances (scale: 0-200 generally) 
    threshold = data.get('threshold', 90)
    
    if not frame_b64:
        return jsonify({"success": False, "error": "Missing frame content."})

    frame = decode_base64_img(frame_b64)
    if frame is None:
        return jsonify({"success": False, "error": "Invalid frame decode."})

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=8, minSize=(100, 100))

    results = []
    
    file_exists = os.path.exists(log_file)
    with open(log_file, mode='a', newline='') as csv_file:
        csv_writer = csv.writer(csv_file)
        if not file_exists:
            csv_writer.writerow(['timestamp', 'predicted_name', 'confidence', 'accepted'])

        for (x, y, w, h) in faces:
            tight_x = x + int(w * 0.1)
            tight_y = y + int(h * 0.1)
            tight_w = int(w * 0.8)
            tight_h = int(h * 0.8)

            face_crop = gray[tight_y:tight_y+tight_h, tight_x:tight_x+tight_w]
            face_resized = cv2.resize(face_crop, (200, 200))
            face_resized = cv2.equalizeHist(face_resized)
            
            try:
                id_, confidence = recognizer.predict(face_resized)
            except Exception as e:
                # Triggers usually if you're trying to predict LBPH matrices inside a corrupt Fisherfaces load
                return jsonify({"success": False, "error": "Algorithms incompatible. You MUST go to the Train tab and Retrain the model first!"})
            
            predicted_name = "Unknown"
            accepted = False
            
            # Distance relaxation
            if confidence < threshold:
                if str(id_) in names_dict:
                    predicted_name = names_dict[str(id_)]
                    accepted = True

            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            csv_writer.writerow([timestamp, predicted_name, f"{confidence:.2f}", accepted])
            
            results.append({
                "box": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
                "name": predicted_name,
                "confidence": round(float(confidence), 1),
                "accepted": accepted
            })
            
    return jsonify({"success": True, "faces": results})

if __name__ == '__main__':
    # Run API unthreaded logic optionally, use simple debug server for local.
    app.run(port=5000, debug=True, use_reloader=False)
