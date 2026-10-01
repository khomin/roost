import cv2
import torch
import os
from PIL import Image
# from ultralytics import YOLO

base_dir = os.path.dirname(os.path.abspath(__file__))

repo_path = os.path.join(base_dir, "yolov5")
model_path = os.path.join(base_dir, "models", "yolov5n.pt")

# Model
# model = torch.hub.load("ultralytics/yolov5", "yolov5s")
# model = torch.hub.load(
#     'ultralytics/yolov5',  # The path to the cloned YOLOv5 repository folder
#     'custom',              # Tells torch.hub.load that you're loading a custom path
#     path='/home/khomin/Documents/PROJECTS/YOLO_detector/models/yolov5nu.pt',  # The path to your local weights file
#     source='local'         # Crucial: Tells the hub to look locally, not on GitHub
# )

# model = YOLO("/home/khomin/Documents/PROJECTS/YOLO_detector/models/yolov5nu.pt") 
# import torch
# ultralytics/yolov5
# model = torch.hub.load('./python/yolov5', 'custom', path='/home/khomin/Documents/PROJECTS/YOLO_detector/models/yolov5nu.pt', source='local', force_reload=True) 
# model = torch.hub.load('./python/yolov5', 'custom', path='/home/khomin/Documents/PROJECTS/YOLO_detector/models/yolov5nu.pt', source='local', force_reload=True) 
# model = torch.hub.load('ultralytics/yolov5', 'custom', path='./models/yolov5nu.pt', force_reload=True)

# model = torch.hub.load("ultralytics/yolov5", "yolov5s")
# force_reload=True

# model = torch.hub.load("/home/khomin/Documents/PROJECTS/YOLO_detector/yolov5", "custom", path='/home/khomin/Documents/PROJECTS/YOLO_detector/yolov5s.pt', source='local')

# /Users/panic/Documents/PROJECTS/YOLO_detector/resources/ultralytics

model = torch.hub.load(repo_path, "custom", path='/home/khomin/Documents/PROJECTS/YOLO_detector/models/yolov5n.pt', source='local')
# model = torch.hub.load("ultralytics/yolov5", "yolov5n", force_reload=True)

# # Image
# img = '/path/to/test/image/25.jpg'
# # Inference
# results = model(img)
# # Results, change the flowing to: results.show()
# results.show()  # or .show(), .save(), .crop(), .pandas(), etc

# Images
# for f in "zidane.jpg", "bus.jpg":
#     torch.hub.download_url_to_file("https://ultralytics.com/images/" + f, f)  # download 2 images


# image_path = "/home/khomin/Downloads/Camera/20251122_151618.jpg"
# image_path = "/home/khomin/Downloads/Camera/20250827_095541.jpg"
image_path = "/home/khomin/Downloads/Camera/20251122_151620.jpg"

# for i in range(10):
#     cap = cv2.VideoCapture(i)
#     if cap.isOpened():
#         print("Camera works at index:", i)
#         cap.release()

# cap = cv2.VideoCapture(5)  # default webcam

# ret, frame = cap.read()
# if not ret:
#     raise RuntimeError("Camera read failed")

# Convert OpenCV (BGR, NumPy) → PIL Image (RGB)
# im1 = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

im1 = Image.open(image_path)  # PIL image
# im2 = cv2.imread("bus.jpg")[..., ::-1]  # OpenCV image (BGR to RGB)

# Inference
results = model([im1], size=640)  # batch of images
# results = model([im1, im2], size=640)  # batch of images

# Results
results.print()
# results.save()  # or .show()
results.show()

results.xyxy[0]  # im1 predictions (tensor)
results.pandas().xyxy[0]  # im1 predictions (pandas)
#      xmin    ymin    xmax   ymax  confidence  class    name
# 0  749.50   43.50  1148.0  704.5    0.874023      0  person
# 1  433.50  433.50   517.5  714.5    0.687988     27     tie
# 2  114.75  195.75  1095.0  708.0    0.624512      0  person
# 3  986.00  304.00  1028.0  420.0    0.286865     27     tie