# Commission System

A modern Commission Management System built with a robust client-server architecture.

## Tech Stack

### Frontend
*   **React 19** with Vite
*   **TypeScript**
*   **Tailwind CSS v4**
*   **Recharts** for analytics
*   **ExcelJS** & **jsPDF** for reporting

### Backend
*   **Node.js** with Express
*   **TypeScript**
*   **Prisma ORM** with SQLite (`better-sqlite3`)
*   **Zod** for validation

## Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm

### Installation

1.  **Install Dependencies** (Root)
    ```bash
    npm install
    ```
    This will automatically install dependencies for both `frontend` and `backend` using the `postinstall` script.

2.  **Environment Setup**
    *   Create `backend/.env` (copy from `.env.example`).
    *   Create `frontend/.env` (copy from `.env.example`).

3.  **Database Setup**
    The installation process triggers `prisma generate`. To seed the database with initial data (Admin user, Brands, Periods):
    ```bash
    npm run seed
    ```

### Running the Application

To start both the Frontend (Vite) and Backend (Express) concurrently:

```bash
npm run dev
```

*   **Frontend:** http://localhost:5173
*   **Backend API:** http://localhost:3001/api

## Project Structure

*   `/frontend`: React SPA source code.
*   `/backend`: Express API source code and Prisma configuration.
*   `package.json`: Orchestration scripts.

## License
Private
