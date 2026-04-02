import os
import cv2
import numpy as np
from PIL import Image
import json

def train_model():
    dataset_path = 'dataset'
    
    if not os.path.exists(dataset_path):
        print(f"Dataset folder '{dataset_path}' not found. Please run capture.py first.")
        return

    # Dictionary to hold the dynamic {id: name} mapping
    names_dict = {}
    current_id = 0
    
    face_samples = []
    ids = []

    print("Scanning dataset folder...")
    
    # Retrieve and sort subfolder names alphabetically
    all_items = os.listdir(dataset_path)
    person_names = sorted([d for d in all_items if os.path.isdir(os.path.join(dataset_path, d))])
    
    # Walk the dataset/ folder, each subfolder name is a person's name
    for name in person_names:
        # Assign numeric ID (sorted alphabetically)
        names_dict[str(current_id)] = name
        person_dir = os.path.join(dataset_path, name)
        
        # Load every .jpg using Pillow
        for img_name in os.listdir(person_dir):
            if img_name.lower().endswith('.jpg'):
                img_path = os.path.join(person_dir, img_name)
                
                # Convert to grayscale array and ensure proper resizing
                PIL_img = Image.open(img_path).convert('L')
                PIL_img = PIL_img.resize((200, 200)) # Images must be 200x200 px
                
                img_numpy = np.array(PIL_img, 'uint8')
                
                # Apply Histogram Equalization to standardize lighting for older datasets
                img_numpy = cv2.equalizeHist(img_numpy)
                
                face_samples.append(img_numpy)
                ids.append(current_id)
                
        # Advance the unique ID for the next person
        current_id += 1

    if len(face_samples) == 0:
        print("No valid JPG face images found for training.")
        return

    # Save mapping to names.json
    with open('names.json', 'w') as f:
        json.dump(names_dict, f, indent=4)
        
    print(f"Found {len(face_samples)} face images.")
    print(f"Saved IDs mapping for {len(names_dict)} person(s) to 'names.json'.")
    print("Training FisherFace model... This may take a moment.")
    
    # Train FisherFaceRecognizer on all images and labels (num_components=0 uses all available components)
    recognizer = cv2.face.FisherFaceRecognizer_create(num_components=0)
    
    # Required to pass ids as integer array
    recognizer.train(face_samples, np.array(ids))

    # Save the trained model to trainer.yml
    recognizer.write('trainer.yml')
    
    # Print confirm when done
    print(f"FisherFace model trained successfully and saved to 'trainer.yml'.")

if __name__ == "__main__":
    train_model()
