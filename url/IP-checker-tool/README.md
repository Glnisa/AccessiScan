# AccessiScan 🔍

A modern, glassmorphism-styled tool to check the accessibility of a large list of URLs from an Excel file.

## 🚀 Features

-   **Excel Support**: Import URLs directly from `.xlsx` or `.xls` files.
-   **Batch Processing**: Efficiently handles 1000+ URLs using concurrent backend workers.
-   **Modern UI**: Beautiful glassmorphism design with real-time progress tracking.
-   **Localization**: Support for English and Turkish.
-   **Export**: Download separate Excel reports for accessible and inaccessible URLs.

## 🛠️ Tech Stack

-   **Frontend**: Vite, Vanilla JS, CSS (Glassmorphism)
-   **Backend**: Node.js, Express, Axios
-   **Parsing**: XLSX (SheetJS)

## 📋 Prerequisites

-   [Node.js](https://nodejs.org/) (v16 or higher)
-   npm (comes with Node.js)

## 🏗️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/url-checker-tool.git
cd url-checker-tool
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 3. Run the Application

You need to run both the frontend and the backend.

**Start the Backend:**
```bash
cd backend
node server.js
```
The backend will run on `http://localhost:3001`.

**Start the Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:5173`.

## 📖 How it Works

1.  **File Upload**: The tool uses `SheetJS` to parse the uploaded Excel file. It extracts any string that looks like a URL or domain.
2.  **Concurrency Control**: The backend processes URLs in batches with a controlled concurrency limit (semaphore pattern) to avoid being blocked by servers or overwhelming your local network.
3.  **Real-time Updates**: The frontend communicates with the backend via a REST API and updates the progress bar and result counters in real-time.

## 🛡️ Reliability & Accuracy

AccessiScan is designed for maximum accuracy when dealing with thousands of URLs:

-   **3-Step Retry Mechanism**: If a URL or IP fails due to a network glitch (timeout, 5xx error, or temporary block), the tool automatically retries up to 3 times.
-   **Exponential Backoff**: Between retries, the tool waits for increasing amounts of time (e.g., 2s, 4s) to allow temporary server-side rate limits or network congestion to clear.
-   **Detection Logic**: 
    -   **URL Mode**: We perform a full `GET` request. Any response status between `200` and `399` (Success or Redirect) is considered **Accessible**. Everything else (404, 500, Socket Errors) is marked as **Inaccessible**.
    -   **IP Mode**: We attempt a TCP connection to Port 80. If the connection is established, it's marked as **Accessible**.

## 📊 HTTP Status Codes Reference

The generated Excel files include a `status` column. Here is what those codes mean:

| Code | Meaning | Outcome |
| :--- | :--- | :--- |
| **200** | **OK**: The page is live and accessible. | ✅ Accessible |
| **301 / 302** | **Redirect**: The URL points to another page. | ✅ Accessible |
| **401 / 403** | **Unauthorized / Forbidden**: Access is restricted by the server. | ❌ Inaccessible |
| **404** | **Not Found**: The page does not exist. | ❌ Inaccessible |
| **429** | **Too Many Requests**: You've been temporarily rate-limited. | ❌ Inaccessible* |
| **500 / 503** | **Server Error**: The website's server is having issues. | ❌ Inaccessible |
| **ETIMEDOUT** | **Timeout**: The server took too long to respond. | ❌ Inaccessible |
| **ENOTFOUND** | **DNS Error**: The domain name cannot be resolved. | ❌ Inaccessible |

> [!TIP]
> *AccessiScan automatically retries on 429 and 5xx errors to minimize false negatives!




