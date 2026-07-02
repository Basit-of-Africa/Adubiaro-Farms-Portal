# Farm Estate Portal (Adubiaro Farm Portal)

A high-performance, private, full-stack agro-real-estate client portal built using **React (Vite) + Express (TypeScript)**. The application serves as an interactive platform where agriculture-focused real estate investors, professional farm managers, and system administrators manage land assets, share localized agronomy updates, distribute legal land-deed documents, track return on investment (ROI) payouts, and visualize financial growth trends.

---

## 🌟 Key Application Features

### 🏢 1. Core Modules and Multi-Role Access Control
The portal is strictly partition-secured into three specialized roles, with custom dashboard workflows, permission structures, and visual environments tailored to each role:

-   **👑 System Administrator (Admin)**
    -   **Investor Registry**: Create, activate, deactivate, or fully search investor records.
    -   **Farm Asset Configuration**: Configure primary farms, plot counts, hectare sizes, crop categories, and allocate coordinates.
    -   **Land Plots Allocation**: Create specific farm plots and assign ownership percentages, investment amounts, and start dates to registered investors.
    -   **Document Distribution Hub**: Upload contract agreements, certificates of ownership, general reports, or specific financial invoices, restricting view access by entire farms or individual plots.
    -   **Financials Manager**: Issue cycle billing payouts, configure yield ROI percentages, set payout dates, and publish invoices.
    -   **System Settings Controls**: Control platform naming, logo texts, latency simulation (for load testing), and toggle email delivery engines (Brevo API, SMTP, or local UI mail logs simulator).

-   **🌾 Farm Manager**
    -   **Assigned Farms Dashboard**: Manage the specific farms assigned by the system admin.
    -   **Agronomic Activity Updates**: Post localized text updates and upload operational field photographs categorized by growth stages (e.g., planting, maintenance, harvesting, pest alerts, weather alerts).
    -   **Collaborative Feed**: Monitor investor reactions, participate in nesting comment chains, and publish reports.

-   **📈 Real-Estate Investor**
    -   **Personalized Analytics Dashboard**: Monitor total invested capital, total active plots, net distributed yield payouts, and active crops.
    -   **Asset Registry**: View detailed breakdowns of individual plots, allocated sizes in hectares, and legal contract references.
    -   **Interactive Timeline Feed**: View high-resolution visual status updates and updates published by assigned managers for their specific plots.
    -   **Secured Documents Vault**: View and download contracts, land titles, certificates of ownership, or invoices.
    -   **Financial Yield Visualization**: Monitor quarterly, annual, and historical payout distributions.

---

### 📊 2. Rich Data Visualization (Recharts Engine)
The **Financials View** includes two advanced responsive charts configured via `recharts` for robust business analytics:
1.  **Quarterly ROI & Payout Performance**: A dual-axis line chart that renders net payout amounts (Naira currency format: `₦`) on the left Y-axis, paired against yield ROI percentages on the right Y-axis.
2.  **Cumulative Investment Growth**: A specialized trend graph displaying the lifetime progression of cumulative investment returns across subsequent billing cycles.
3.  **CSV Export Engine**: Standard, single-click client-side export utility converting complete table ledgers into downloadable spreadsheet files.

---

### 🧭 3. Adaptive "Interactive Portal Tour" Onboarding
An advanced, self-contained onboarding tour is integrated via `/src/components/OnboardingTour.tsx` to guide new users through the dashboard layout:
-   **Dynamic Spotlight Masking**: Calculates element bounds dynamically using `getBoundingClientRect` and overlays high-contrast focused spotlights over elements.
-   **Viewport Auto-Scroll**: Uses smooth scrolling mechanics to center targeted elements within the screen.
-   **Responsive Selector Swapping**: Seamlessly detects and maps layout elements depending on the current viewport width (e.g., swapping desktop `#global-search-container` with mobile `#mobile-search-container` matches).
-   **Mobile-Optimized Tooltip Centering**: Intelligently swaps relative placement to centered overlay modaling on touch displays, ensuring zero viewport clipping.

---

### 🗃️ 4. Hybrid Multi-Database Architecture
The application is engineered with a modular, highly resilient backend that dynamically manages three separate database persistence layers depending on availability and system settings:

1.  **🔥 Cloud-Backed Firebase (Firestore Client - Lite)**
    -   Acts as the primary durable cloud-persistence layer.
    -   Saves and retrieves data across collections (`users`, `farms`, `plots`, `investorPlots`, `assignments`, `updates`, `documents`, `financials`, `simulatedEmails`, `settings`).
    -   Features automatic connection probes, robust error classification (network timeout vs. unauthorized permission blocks), and exponential backoff retry engines.
2.  **🐘 Relational PostgreSQL (Cloud SQL Support)**
    -   Synchronizes with PostgreSQL using upsert transactions (`INSERT ... ON CONFLICT (id) DO UPDATE`).
    -   Handles schema creation and SSL/non-SSL connection fallback.
3.  **💾 Fallback Local JSON File Engine**
    -   Maintains a fallback file storage system (`/data/db.json`) if cloud services are unavailable.

---

### 📧 5. Outbound Communication & Email Delivery System
-   **Simulation Logs Terminal**: Allows administrators to view simulated emails directly within the UI.
-   **SMTP Engine**: Standard SMTP configurations using credentials such as `EMAIL_HOST`, `EMAIL_PORT`, and TLS settings.
-   **Brevo API Integration**: Integrated direct HTTP POST client delivering template-styled emails.

---

## 🛠️ Technology Stack & Dependencies

-   **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts (Data Charts), Lucide React (Icons), Motion / Framer Motion (Animations).
-   **Backend**: Express (Node.js REST API), TSX (TypeScript runtime execution), Esbuild (Backend bundling), Multer (Image file uploads).
-   **Database Drivers**: Firebase Lite Client, PostgreSQL PG Client, Local File System (`fs`).
-   **Transporters**: Nodemailer (SMTP), Fetch (Brevo HTTP API), Cloudinary API (Image hosting).

---

## 📂 Project Directory Structure

```text
/
├── server.ts                       # Full-stack backend entry point (Vite Dev + Express API Middleware)
├── package.json                    # Application metadata, scripts, and dependencies
├── metadata.json                   # AI Studio app metadata and permissions
├── firebase-applet-config.json     # Provisioned Firebase app details & Firestore configurations
├── firebase-blueprint.json         # Bootstrapped collection definitions
├── firestore.rules                 # Security configurations for Cloud Firestore
├── .env.example                    # Template defining required environment secrets
├── public/                         # Public static files and assets
└── src/                            # Frontend application codebase
    ├── main.tsx                    # React client-side bootstrap entry point
    ├── App.tsx                     # Primary router, layout wrapper, and user state controller
    ├── index.css                   # Global Tailwind CSS file and theme font variables
    ├── types.ts                    # Global TypeScript interfaces, enum models, and system schemas
    ├── utils/                      # Helper functions and formatting utilities
    └── components/                 # Reusable React components and specialized sub-views
        ├── Login.tsx               # Credentials authentication gate screen
        ├── Sidebar.tsx             # Collapsible side navigation containing responsive menus
        ├── OnboardingTour.tsx      # Onboarding guide with spotlights
        ├── DashboardStats.tsx      # High-impact bento metric cards with tooltips
        ├── InvestorDashboard.tsx   # Dashboard customized for agro-real-estate investors
        ├── ManagerDashboard.tsx    # Dashboard tailored for assigned farm operations
        ├── AdminDashboard.tsx      # Dashboard containing administrative controls
        ├── FarmDetail.tsx          # Timeline and updates feed
        ├── CommentsSection.tsx     # Threaded comments feed with author roles
        ├── FinancialsView.tsx      # Financial ledgers with Recharts visual graphs
        ├── InvestorsView.tsx       # Registry with allocation, active status, and documents upload modal
        ├── EmailOutbox.tsx         # Central terminal displaying outbound logs
        ├── SettingsView.tsx        # System settings for theme, portal details, latency, and keys
        ├── GlobalSearch.tsx        # Comprehensive database search dropdown
        ├── NotificationBell.tsx    # Real-time bell trigger and inbox logs modal
        └── QuickActions.tsx        # Quick utility triggers
```

---

## ⚙️ Setup and Installation

Follow these steps to configure, build, and run the application locally or in a production environment:

### 1. Prerequisites
Ensure you have **Node.js** (v18 or higher) and **npm** installed.

### 2. Install Dependencies
Execute the following command in the root workspace directory:
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory and add the following keys. Customize them as needed:
```env
# Application Port (Defaults to 3000)
PORT=3000

# Cloud Database Persistence Configurations
DATABASE_URL=postgres://user:password@host:port/database?sslmode=require
FIREBASE_CONFIG={"apiKey":"your-api-key","authDomain":"your-project.firebaseapp.com","projectId":"your-project","storageBucket":"your-project.appspot.com","messagingSenderId":"your-sender-id","appId":"your-app-id"}

# Outbound Email Configurations
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=Adubiaro Farms <noreply@adubiaro.com>

# Cloud Image Hosting (Cloudinary)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

### 4. Run Development Server
To launch the application locally with hot module reloading and express backend API routing running in parallel, run:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 5. Build and Deploy
To compile the frontend and bundle the Express backend server into a single production-ready CommonJS file, execute:
```bash
npm run build
```
Once built, you can start the production instance using:
```bash
npm run start
```

---

## 🔒 Security and Permissions
The application utilizes a strictly client-safe credentials layer:
-   **Encrypted Secrets**: All cloud API keys and SMTP credentials remain completely confined to the Node.js server sandbox. Secrets are never exposed to the client browser.
-   **Firestore Rules Safeguard**: Standard security configurations restrict direct document manipulation.
-   **Granular Views**: Render elements, buttons, and navigation options strictly based on the authenticated user's role defined in the system.
