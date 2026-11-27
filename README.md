# 💎 Fashion Jewellers

> **A Premium Full-Stack Jewellery E-Commerce & Management Platform**

Fashion Jewellers is a modern, full-stack jewellery platform designed to combine luxury e-commerce experiences with intelligent business and inventory management.

Built using the **PERN Stack (PostgreSQL, Express.js, React.js, and Node.js)**, the application provides a centralized environment for managing jewellery products, inventory, customers, orders, suppliers, and business performance.

The platform features dedicated dashboards for Admins and three employee roles, cloud-based product image management, sales reporting, competitor analysis, and an AI-powered Instagram posting and approval workflow.

With a premium user interface, role-based access control, and intelligent automation, Fashion Jewellers aims to streamline jewellery business operations while enhancing the digital customer experience.

---

## ✨ Key Features

### 🛍️ 1. Jewellery E-Commerce Experience

- Premium jewellery product presentation.
- Organized product categories, including Rings, Earrings, Bracelets, and Sets.
- Interactive product browsing.
- Live shopping cart calculations.
- Stock-aware cart validation to prevent orders exceeding available inventory.
- Multi-option checkout experience.
- Dynamic PDF invoice and receipt generation.
- Customer reviews and star-based product ratings.
- Persistent customer authentication using JWT.

### 📦 2. Product & Inventory Management

- Centralized jewellery product management.
- Product information and stock monitoring.
- Inventory-related operations.
- Supplier information management.
- Cloud-based product image storage.
- Product status and inventory tracking.
- Database-driven inventory information.

### 👥 3. Role-Based Dashboard System

Fashion Jewellers provides separate dashboards according to user responsibilities.

**Admin Dashboard**

Provides administrative access to the platform's management modules, including:

- Product Management
- Customer Management
- Supplier Data
- Order Management
- Sales Report
- Products Posting
- Post Confirmation

**Inventory Manager Dashboard**

Designed for inventory and stock-related operations.

- Products & Inventory
- Supplier Data
- Sales Report

**Sales Executive Dashboard**

Designed to support customer and order-related activities.

- Customer Management
- Order Management

**Social Media Manager Dashboard**

Provides restricted access to product information and social media-related operations.

- Products
- Post Confirmation

Each employee role has its own dashboard options and access permissions.

### 📊 4. Sales Report & Business Analytics

The application includes a dedicated Sales Report module accessible through the Admin and Inventory Manager dashboards.

Its purpose is to provide useful insights into business performance using existing database records.

The reporting functionality is designed around:

- Daily sales reports.
- Weekly sales reports.
- Monthly sales reports.
- Yearly sales reports.
- Custom date-range analysis.
- Revenue and sales summaries.
- Order statistics.
- Product-wise sales analysis.
- Top-selling and low-selling product analysis.
- Sales trends and graphical visualizations.
- PDF report generation and export.

Financial calculations are based on available business data rather than fabricated values.

### 📈 5. Competitor Analysis

Fashion Jewellers also includes a dedicated Competitor Analysis module.

This feature provides a separate area for analyzing competitor-related information to support business evaluation and decision-making.

It extends the platform beyond routine inventory operations by introducing a business analysis capability.

### 🤖 6. AI-Powered Instagram Posting Automation

One of the major additions to Fashion Jewellers is its AI-powered Instagram posting workflow.

The application integrates **n8n, Grok API, and Gmail API** to support an automated product-posting and approval process.

The workflow includes:

- Initiating a posting request for a selected jewellery product.
- AI-powered product image enhancement using Grok API.
- AI-assisted generation of social media captions and related content.
- Sending product approval requests through Gmail.
- Receiving human approval or rejection through the email approval process.
- Continuing the Instagram publishing workflow after approval.

The system maintains separate information for original product images and enhanced social media images.

The automation is designed to reduce manual social media preparation while keeping a human approval step in the publishing process.

### ☁️ 7. Cloud-Based Image Management

Product images are managed using **Cloudinary**.

Key capabilities include:

- Uploading product images to Cloudinary.
- Storing hosted image URLs in the PostgreSQL database.
- Maintaining Cloudinary public identifiers for image management.
- Removing temporary local upload files after successful processing.
- Keeping original product images separate from enhanced social media images.

This approach reduces dependency on permanent local image storage.

### 🔐 8. Authentication & Security

- JWT-based user authentication.
- Separate Admin and Employee login portals.
- Role-based access control.
- Role-specific dashboard navigation.
- Protected application operations.
- Persistent customer login sessions.
- Independent Admin and Employee authentication contexts.

### 🎨 9. Modern User Interface

The application features a refined, luxury jewellery-inspired interface.

UI improvements include:

- Premium dark-mode aesthetics.
- Elegant gold accents.
- Modern dashboard layouts.
- Glassmorphism-inspired elements.
- Interactive cards and components.
- Consistent navigation across user roles.
- Responsive layouts and polished visual elements.

---

## 🛠️ Technology Stack

Fashion Jewellers follows the **PERN architecture** and integrates additional tools and services for cloud storage and intelligent automation.

| Category | Technology |
|---|---|
| Frontend | React.js |
| Frontend Build Tool | Vite |
| Backend Runtime | Node.js |
| Backend Framework | Express.js |
| Database | PostgreSQL |
| Database Hosting | Neon |
| Authentication | JSON Web Tokens (JWT) |
| Image Storage | Cloudinary |
| File Upload Handling | Multer |
| AI Image Enhancement | Grok API |
| Workflow Automation | n8n |
| Email Approval Integration | Gmail API |
| Version Control | Git & GitHub |
| Frontend Deployment | Planned — Vercel |
| Backend Deployment | Planned — Microsoft Azure |

---

## 🏗️ System Architecture

The application follows a client-server architecture.

The frontend communicates with the backend through RESTful APIs, while the backend handles application logic, authentication, authorization, and database operations.

PostgreSQL provides centralized data storage through Neon Cloud, and Cloudinary manages product image assets.

The AI-powered social media workflow operates through a separate n8n automation environment integrated with the application.

### High-Level Architecture

```text
                USERS
                  |
                  v
           REACT FRONTEND
              (Vite)
                  |
                  v
          NODE.JS + EXPRESS
             BACKEND
                  |
          +-------+-------+
          |               |
          v               v
      POSTGRESQL       CLOUDINARY
        (Neon)         (Images)
          |
          |
    Application Data
          |
          v
    n8n AUTOMATION
          |
     +----+-----+
     |          |
     v          v
  GROK API   GMAIL API
     |
     v
  AI-ASSISTED
  INSTAGRAM POSTING
  AND APPROVAL
```

---

## 🗂️ Project Structure

The project is organized into separate frontend and backend directories.

```text
Fashion-Jewellery/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── assets/
│   │   └── ...
│   │
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── config/
│   ├── package.json
│   └── ...
│
├── db/
│   └── setup_postgres.sql
│
└── README.md
```

*Note: This is a representative structure. Actual folder and file names may differ according to the current repository organization.*

---

## 📥 Installation & Local Setup

Follow these steps to run Fashion Jewellers locally.

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Git
- Access to a PostgreSQL database
- A Neon database connection
- A Cloudinary account for image storage

### 1. Clone the Repository

```bash
git clone https://github.com/m-binarif/Fashion-Jewellery.git

cd Fashion-Jewellery
```

### 2. Database Configuration

Fashion Jewellers uses PostgreSQL hosted through Neon Cloud.

1. Create or access a PostgreSQL database in Neon.
2. Obtain the database connection details.
3. Configure the backend environment variables.
4. Run the required database initialization scripts if the database has not already been initialized.

The project includes a database setup script:

```text
db/setup_postgres.sql
```

Use this script according to the actual database initialization requirements.

**Note:** Do not run the setup script against an existing production database without checking whether its operations could overwrite or duplicate existing data.

### 3. Backend Setup

Navigate to the server directory:

```bash
cd server
```

Install the dependencies:

```bash
npm install
```

Create the environment configuration file:

```bash
cp .env.example .env
```

Configure the required values according to the backend's actual environment-variable definitions.

Example configuration:

```env
# Database
DB_HOST=your_neon_host
DB_PORT=5432
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# Authentication
JWT_SECRET=your_jwt_secret

# Server
PORT=5000

# Frontend
FRONTEND_ORIGIN=http://localhost:5173

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Configure PostgreSQL SSL according to the Neon connection requirements and the backend's database client configuration.

If your backend uses a connection-string variable instead of individual database variables, follow the names defined in the actual source code.

Never commit `.env` files or expose credentials in the repository.

Start the backend:

```bash
npm run dev
```

The backend will run on the configured local port, typically:

```text
http://localhost:5000
```

### 4. Frontend Setup

Open a new terminal and navigate to the client directory:

```bash
cd client
```

Install frontend dependencies:

```bash
npm install
```

Configure the frontend API base URL using the environment variable expected by the existing Vite application.

For example:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

---

## 🌐 Deployment Status

The project currently uses cloud-hosted services for data storage and product image management.

| Component | Current status |
|---|---|
| PostgreSQL Database | Hosted on Neon Cloud |
| Product Image Storage | Cloudinary |
| Backend | Local development / Azure deployment preparation |
| Frontend | Local development / Vercel deployment preparation |
| n8n Automation | Self-hosted locally through Docker |

The frontend and backend are being prepared for separate deployment.

The planned deployment architecture is:

- **Frontend:** Vercel
- **Backend:** Microsoft Azure
- **Database:** Neon Cloud
- **Image Storage:** Cloudinary
- **Automation:** n8n

The application is not yet fully deployed as a public web platform. Deployment configuration and production integration are ongoing.

---

## 🔒 Environment Variables & Security

For security reasons:

- Never commit database passwords.
- Never expose JWT secrets.
- Never expose Cloudinary API secrets.
- Never expose Grok API credentials.
- Never publish Gmail authentication credentials.
- Never expose n8n webhook authentication secrets.
- Store deployment credentials in the respective hosting platforms' environment variable settings.
- Keep sensitive workflow credentials within the appropriate automation environment.

Use `.env.example` to document required configuration variables without including actual secret values.

---

## 🚀 Future Enhancements

Potential areas for future development include:

- Complete production deployment of frontend and backend.
- Domain configuration and production environment setup.
- Improved business analytics and reporting.
- Further enhancement of AI-assisted social media operations.
- Additional competitor intelligence capabilities.
- Further optimization of application performance and security.
- Additional customer-facing e-commerce features.

---

## 👨‍💻 Developer

**Fashion Jewellers** is developed as a full-stack engineering project, combining modern web technologies, cloud services, database management, and AI-powered automation to support jewellery business operations.

---

## 📄 License

This project is developed as an academic and engineering project.

Add an appropriate license before distributing or reusing the source code publicly.