# 🌟 Fashion Jewellers

> A Premium, Full-Stack Luxury Jewelry E-commerce Experience.

Welcome to **Fashion Jewellers**, a state-of-the-art e-commerce platform built to deliver an elegant, fast, and secure luxury shopping experience. Designed with a stunning dark-mode aesthetic, glowing golden borders, and glassmorphism elements, this full-stack application brings high-end jewelry shopping to life.

---

## 🛠️ Tech Stack (The PERN Architecture)

Fashion Jewellers is architected on the robust and scalable **PERN Stack**:

*   **Database (P):** PostgreSQL (Hosted serverless on Neon Cloud) — structured relational database schema featuring custom primary key sequences, checks, and referential integrity constraints.
*   **Backend (E):** Node.js & Express.js — a clean RESTful API gateway handling user authentication, order processing, and dynamic transaction operations.
*   **Frontend (R):** React.js (Vite) — single-page application (SPA) optimized for performance and responsivity. Styled using custom luxury styling systems.
*   **Runtime (N):** Node.js — powerful underlying engine powering all asynchronous backend services.

---

## ✨ Key Features

*   🔮 **Visual Masterpiece Grid:** A stabilized, premium homepage showcasing designated product curations (Sets, Earrings, Rings, and Bracelets) aligned symmetrically.
*   🛒 **Live Cart & Stock Control:** Real-time customer cart calculations with safe boundary limits preventing orders exceeding available stock levels.
*   💳 **Seamless Checkout & Dynamic Invoices:** Multi-option checkout interfaces generating immediate transaction records and dynamically generating a downloadable **PDF receipt/invoice**.
*   🔒 **Session Persistence (The Refresh Fix):** Full auth persistence powered by JWT and browser `localStorage`. Customers stay logged in securely across page refreshes.
*   ⭐ **Customer Review Hub:** Interactive feedback portal allowing authenticated users to post star-ratings and detailed reviews on specific products.
*   ⚙️ **Admin Dashboard Portal:** A dedicated interface for managing inventory, tracking overall store sales, monitoring active orders, and managing suppliers.
*   🔑 **Native Sequence PK Automation:** Automates future database primary keys (e.g., product IDs starting at `P011+`) through native PostgreSQL sequence triggers, preserving old baseline data.

---

## 📥 Installation & Setup

Follow these simple steps to set up and run Fashion Jewellers locally on your machine:

### 1. Clone the Repository
```bash
git clone https://github.com/m-binarif/Fashion-Jewellery.git
cd Fashion-Jewellery
```

### 2. Configure Database & Schema
1. Create a fresh database instance in **PostgreSQL**.
2. Run the database seed script **[setup_postgres.sql](file:///c:/Users/User/OneDrive/MBA%20(NED)/4th%20Semester/DBMS/CEP/DBMS_CEP/Fashion-Jewellery/db/setup_postgres.sql)** located in the `db/` folder to create the tables, sequences, and populate baseline data:
   ```bash
   psql -U your_postgres_user -d your_database_name -f db/setup_postgres.sql
   ```

### 3. Backend Setup
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file (you can copy `.env.example` as a starting point) and add your connection variables:
   ```bash
   cp .env.example .env
   ```
4. Fill in your Postgres connection credentials and JWT secrets inside `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=fashion_jewellery_db
   JWT_SECRET=your_secret_key
   PORT=5000
   FRONTEND_ORIGIN=http://localhost:5173
   ```

### 4. Frontend Setup
1. Navigate to the `client` directory:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

---

## 🚀 How to Run

### Start the Backend Server
From the `server` directory, run:
```bash
npm run dev
```
*The server will start listening on `http://localhost:5000` with standard connection indicators.*

### Start the Frontend Client
From the `client` directory, run:
```bash
npm run dev
```
*Your browser will launch the portal at `http://localhost:5173` immediately.*

---

## 📸 Screenshots & Demo

*(Optional placeholders to show off our premium glassmorphic interface)*

| Homepage Hero | Product Catalogue |
| :---: | :---: |
| ![Homepage Placeholder](https://via.placeholder.com/600x350/111111/D4AF37?text=Fashion+Jewellers+Hero) | ![Catalogue Placeholder](https://via.placeholder.com/600x350/111111/D4AF37?text=Product+Catalogue) |

---

## 👥 Author & Contributions

Created with passion for high-end design and solid relational database architecture.

*   **GitHub:** [@m-binarif](https://github.com/m-binarif)
*   **LinkedIn:** [Your Name](https://www.linkedin.com/in/your-profile-placeholder)

Feel free to open an issue or submit a pull request if you want to contribute to this luxury shopping platform!
