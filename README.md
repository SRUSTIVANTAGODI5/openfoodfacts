\# 🥗 OpenFood Scanner



OpenFood Scanner is a web application that allows users to scan food product barcodes and retrieve detailed product information using the Open Food Facts database.



Users can scan a barcode using their camera, upload a barcode image, or enter a barcode manually to view product information such as ingredients, allergens, categories, Nutri-Score, NOVA Group, and nutritional values.



\## ✨ Features



\* 📷 Scan product barcodes using a camera

\* 📤 Upload a barcode image

\* 🔎 Search products using a barcode manually

\* 🥗 Display product name, brand, and quantity

\* 🥕 View ingredients

\* ⚠️ View allergen information

\* 📂 View product categories

\* ⭐ Display Nutri-Score

\* 🔬 Display NOVA Group

\* 📊 Display nutritional information per 100g

\* 🇬🇧 Display available product information in English

\* 🔄 Scan another product without refreshing the page

\* 📱 Responsive design for desktop and mobile devices

\* ⚠️ User-friendly error and loading messages

\* 🐳 Docker support for running the application



\## 🛠️ Technologies Used



\### Frontend



\* React

\* Vite

\* JavaScript

\* HTML

\* CSS

\* html5-qrcode



\### Backend



\* Python

\* FastAPI

\* OpenCV

\* Pillow

\* pyzbar

\* Requests



\### APIs and Services



\* Open Food Facts API

\* MyMemory Translation API



\### Development Tools



\* Docker

\* Docker Compose

\* Git

\* GitHub

\* Visual Studio Code



\## 🔄 How It Works



```text

User

&#x20; ↓

Scan Camera / Upload Image / Enter Barcode

&#x20; ↓

Barcode Detection

&#x20; ↓

React Frontend

&#x20; ↓

FastAPI Backend

&#x20; ↓

Open Food Facts API

&#x20; ↓

Product Information

&#x20; ↓

React Frontend

&#x20; ↓

Display Product Details

```



For camera scanning, the application uses `html5-qrcode` to detect the barcode directly from the camera.



For uploaded images, the FastAPI backend processes the image using OpenCV, Pillow, and pyzbar to detect the barcode.



After obtaining the barcode, the backend requests product information from Open Food Facts and sends the relevant information back to the React frontend.



\## 📋 Product Information



The application can display:



\* Product name

\* Brand

\* Quantity

\* Product image

\* Ingredients

\* Allergens

\* Categories

\* Nutri-Score

\* NOVA Group

\* Energy

\* Fat

\* Saturated fat

\* Carbohydrates

\* Sugars

\* Fiber

\* Protein

\* Salt

\* Sodium



Nutrition values are displayed per 100g when the corresponding information is available in the Open Food Facts database.



\## 📁 Project Structure



```text

openfoodfacts/

│

├── backend/

│   ├── main.py

│   ├── requirements.txt

│   ├── Dockerfile

│   └── .dockerignore

│

├── frontend/

│   ├── src/

│   │   ├── App.jsx

│   │   ├── App.css

│   │   ├── index.css

│   │   └── main.jsx

│   │

│   ├── Dockerfile

│   ├── .dockerignore

│   ├── package.json

│   └── vite.config.js

│

├── docker-compose.yml

├── package.json

├── package-lock.json

└── README.md

```



\## 🚀 How to Run Locally



\### Prerequisites



Make sure you have:



\* Node.js

\* Python

\* Docker Desktop

\* Git



\### Using Docker



Open PowerShell and navigate to the project folder:



```powershell

cd C:\\Users\\srust\\OneDrive\\Desktop\\openfoodfacts

```



Start the application:



```powershell

docker compose up -d

```



The frontend will be available at:



```text

http://localhost:5173

```



The backend API will be available at:



```text

http://127.0.0.1:8000

```



FastAPI interactive documentation:



```text

http://127.0.0.1:8000/docs

```



To stop the application:



```powershell

docker compose down

```



\## 🔍 Example Barcode



You can test the application with this barcode:



```text

3017620422003

```



This barcode can be used to test the manual search and camera scanning functionality.



\## ⚠️ Product Availability



Product information depends on the Open Food Facts database.



If a barcode is successfully detected but the product is not present in the Open Food Facts database, the application informs the user that the product is unavailable.



\## 🌍 Data Source



Product information is provided by the Open Food Facts project.



Open Food Facts is an open database of food products from around the world.



\## 🔐 Error Handling



The application handles common situations such as:



\* Invalid barcode input

\* Barcode with incorrect length

\* Unsupported image format

\* Empty uploaded image

\* Barcode not detected

\* Product not found

\* Backend connection problems

\* API connection problems

\* Invalid API responses

\* Camera permission problems



\## 🎯 Project Purpose



This project was developed as a practical full-stack application to demonstrate:



\* Frontend development with React

\* Backend API development with FastAPI

\* Barcode detection

\* REST API integration

\* Image processing

\* External API integration

\* Data transformation

\* Error handling

\* Responsive web design

\* Docker containerization



\## 👩‍💻 Author



\*\*Srusti Vantagodi\*\*



Computer Science and Engineering Undergraduate



\---



⭐ If you find this project useful, consider giving the repository a star.



