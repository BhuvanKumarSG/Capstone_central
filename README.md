# DeepSync 🚀

DeepSync is a web application that leverages AI to clone a person's likeness and voice, allowing users to generate new video content from just a script. It provides a seamless front-end experience for uploading source video/audio, providing a script, and generating a perfectly lip-synced video.

---

## Key Features

* ✨ **AI-Powered Digital Avatars:** Clones a person's likeness and voice from uploaded source files to create a reusable digital asset.
* 🎬 **Script-Driven Animation:** Generates new video content with precisely synchronized audio and natural facial movements directly from a text script.
* **Intuitive User Flow:** A simple, guided step-by-step process: upload video, upload audio, enter script, and generate.
* 🌌 **Dynamic & Modern UI:** Features a fully responsive, dark-themed interface with an animated parallax starfield background, smooth page transitions, and modern design principles.
* 📂 **Simple Asset Management:** A client-side library to view currently uploaded video and audio assets before generation.

---

## Technology Stack

This project is the front-end interface built with:

* **React:** For building the user interface.
* **JavaScript (ES6+):** Core application logic.
* **CSS3:** For all styling, animations, and responsive design.
* **HTML5:** For the application structure.

*Note: This front-end is designed to connect to a backend server (e.g., Python/Flask) running on `http://localhost:8000` to handle the AI-intensive video and audio processing tasks.*

---

## Getting Started

To get a local copy up and running, follow these simple steps.

### Run using docker
1. **Install docker desktop**
2. **Run docker compose yaml file**
   ```
   docker compose up --build
   ```

### Installation

1.  **Clone the repo**
    ```sh
    git clone https://github.com/BhuvanKumarSG/Capstone_central
    ```
2.  **Install NPM packages in frontend**
    ```sh
    cd frontend
    npm install
    ```
3.  **Run the application**
    ```sh
    npm start
    ```
    The site will be available at `http://localhost:3000`.
4. **Start the backend**
   ```sh
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

   Run this if it isn't connecting
   ```sh
   uvicorn main:app --reload
   ```
   

---

## Our Team

This project was developed by:

* **Bhuvan Kumar S G** - `1BM22CD018`
* **S Danush** - `1BM22CD052`
* **Srujana A Rao** - `1BM22CD062`

Under the guidance of:
* **Dr. Shambhavi B R** - *Team Guide*

---
