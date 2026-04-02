import cv2
import json
import os
import csv
from datetime import datetime

def recognize_faces():
    # Load names.json and trainer.yml at startup
    if not os.path.exists('names.json') or not os.path.exists('trainer.yml'):
        print("Missing 'names.json' or 'trainer.yml'. Please ensure you have run train.py first.")
        return

    with open('names.json', 'r') as f:
        names_dict = json.load(f)

    # Initialize FisherFace recognizer
    recognizer = cv2.face.FisherFaceRecognizer_create()
    recognizer.read('trainer.yml')

    # Load matching Haar Cascade
    cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    face_cascade = cv2.CascadeClassifier(cascade_path)

    # Open webcam stream
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not access the webcam.")
        return

    # Check existence and open predictions CSV for appending
    csv_file_path = 'predictions_log.csv'
    file_exists = os.path.exists(csv_file_path)
    
    csv_file = open(csv_file_path, mode='a', newline='')
    csv_writer = csv.writer(csv_file)
    
    # Write columns to log if just created
    if not file_exists:
        csv_writer.writerow(['timestamp', 'predicted_name', 'confidence', 'accepted'])

    print("Real-Time recognition started! Look at the camera. Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Detect face with Haar Cascade using identical configurations (grayscale applied)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(60, 60)
        )

        for (x, y, w, h) in faces:
            # Predict only on precisely cropped, 200x200 grayscale images
            face_crop = gray[y:y+h, x:x+w]
            face_resized = cv2.resize(face_crop, (200, 200))
            
            # Apply Histogram Equalization before predicting
            face_resized = cv2.equalizeHist(face_resized)
            
            # Predict face identity
            id_, confidence = recognizer.predict(face_resized)
            
            predicted_name = "Unknown"
            accepted = False
            box_color = (0, 0, 255) # Red bounding box
            
            # Relaxed threshold: If confidence < 250 -> display the person's name in a green bounding box
            if confidence < 250:
                if str(id_) in names_dict:
                    predicted_name = names_dict[str(id_)]
                    accepted = True
                    box_color = (0, 255, 0) # Green bounding box

            # Overlay name and confidence score on frame
            label_text = f"{predicted_name} ({confidence:.1f})"
            
            cv2.rectangle(frame, (x, y), (x+w, y+h), box_color, 2)
            cv2.putText(frame, label_text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, box_color, 2)

            # Log prediction to predictions_log.csv
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            csv_writer.writerow([timestamp, predicted_name, f"{confidence:.2f}", accepted])

        # Render recognition window
        cv2.imshow('Real-Time Face Recognition', frame)

        # Wait for quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Release camera and close CSV on exit
    cap.release()
    cv2.destroyAllWindows()
    csv_file.close()
    print("Camera released. Exiting recognition.")

if __name__ == "__main__":
    recognize_faces()
