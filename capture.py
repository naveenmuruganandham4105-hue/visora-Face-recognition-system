import cv2
import os
import time

def main():
    # Ask user for their name via input()
    name = input("Enter name for enrollment: ").strip()
    if not name:
        print("Name cannot be empty.")
        return

    # Create dataset/<name>/ if it doesn't exist
    dataset_dir = os.path.join("dataset", name)
    os.makedirs(dataset_dir, exist_ok=True)

    # Load haarcascade_frontalface_default.xml from cv2.data.haarcascades
    cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    face_cascade = cv2.CascadeClassifier(cascade_path)
    if face_cascade.empty():
        print("Failed to load Haar cascade.")
        return

    # Open webcam with cv2.VideoCapture(0)
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open the webcam.")
        return

    count = 0
    total_images = 50
    last_capture_time = time.time() - 1  # allows immediate first capture

    print(f"Look at the camera. Starting capture for '{name}'...")

    while count < total_images:
        ret, frame = cap.read()
        if not ret:
            print("Failed to access camera frame.")
            break

        # Convert to grayscale before face detection
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detect faces each frame using detectMultiScale
        faces = face_cascade.detectMultiScale(
            gray_frame,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60)
        )

        display_frame = frame.copy()

        # Iterate over detected faces
        for (x, y, w, h) in faces:
            # Show a live bounding box around the detected face
            cv2.rectangle(display_frame, (x, y), (x+w, y+h), (255, 0, 0), 2)

            current_time = time.time()
            # Save one image per second
            if current_time - last_capture_time >= 1.0:
                # Capture cropped face image and resize to 200x200 px
                face_crop = gray_frame[y:y+h, x:x+w]
                face_resized = cv2.resize(face_crop, (200, 200))
                
                # Apply Histogram Equalization to standardize lighting
                face_resized = cv2.equalizeHist(face_resized)
                
                count += 1
                
                # Save as 1.jpg through 30.jpg
                img_path = os.path.join(dataset_dir, f"{count}.jpg")
                cv2.imwrite(img_path, face_resized)
                
                last_capture_time = current_time
                print(f"Captured image {count}/{total_images}")
                
            # Only process one face for the primary user
            break

        # Show a 'Captured: X/30' countdown overlay on screen
        cv2.putText(
            display_frame, 
            f"Captured: {count}/{total_images}", 
            (20, 40), 
            cv2.FONT_HERSHEY_SIMPLEX, 
            1, (0, 255, 0), 2
        )

        cv2.imshow('Face Enrollment', display_frame)

        # Allow user to quit early
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("Capture cancelled.")
            break

    # Release camera and close windows when done
    cap.release()
    cv2.destroyAllWindows()
    
    if count == total_images:
        print(f"Successfully finished capturing {total_images} images for '{name}'.")

if __name__ == "__main__":
    main()
