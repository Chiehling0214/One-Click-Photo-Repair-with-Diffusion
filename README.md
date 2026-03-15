# One-Click-Photo-Repair-with-Diffusion

## How to Setup for Backend
### Prerequisites
- **Python 3.11 or later**
- **git**

In CMD,   
```bash
cd backend
```

```bash
setup.bat
```

## How to Run Inpainting API Server

In CMD,    
```bash
cd backend
```

```
run.bat
```

If you see
```bash
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```
it means the API is ready, you can repair photo.

## How to Run the Vite + React App Locally 

### Prerequisites

- **Node.js**
- **npm**

Check your versions:

```bash
node -v
npm -v
```

### Install Dependencies

```bash
cd frontend
npm install
```

### Start the Dev Server

```bash
npm run dev
```

Vite will print a URL in the terminal.
Open that URL in your browser.
> Note: The frontend calls a backend API, so ensure that the backend is running.