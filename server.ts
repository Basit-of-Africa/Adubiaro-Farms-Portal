/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import pg from 'pg';
import { v2 as cloudinary } from 'cloudinary';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { initializeApp as initializeFirebaseApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import {
  User,
  UserRole,
  Farm,
  FarmPlot,
  InvestorPlot,
  FarmManagerAssignment,
  FarmUpdate,
  Document,
  DocumentCategory,
  DocumentVisibility,
  FinancialSummary,
  SimulatedEmail,
  PlotStatus,
  UpdateType,
  FinancialStatus,
  SystemSettings
} from './src/types';

// Establish folders
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Initialize express
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Super Admin Latency Injection Middleware
app.use((req, res, next) => {
  const settings = getSettings();
  if (settings.simulatedLatency && settings.simulatedLatency > 0 && req.url.startsWith('/api')) {
    setTimeout(next, settings.simulatedLatency);
  } else {
    next();
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Setup lazy Cloudinary configuration
let isCloudinaryConfigured = false;
function getCloudinary() {
  if (!isCloudinaryConfigured && process.env.CLOUDINARY_URL) {
    try {
      cloudinary.config({
        cloudinary_url: process.env.CLOUDINARY_URL
      });
      isCloudinaryConfigured = true;
      console.log('✅ Cloudinary connected successfully via CLOUDINARY_URL');
    } catch (e) {
      console.error('❌ Cloudinary configuration failed:', e);
    }
  }
  return cloudinary;
}

// Setup lazy SMTP email configuration
let mailTransporter: any = null;
function getMailTransporter() {
  if (!mailTransporter && process.env.EMAIL_HOST) {
    try {
      mailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_USE_TLS === 'false' ? false : true,
        auth: {
          user: process.env.EMAIL_HOST_USER,
          pass: process.env.EMAIL_HOST_PASSWORD
        }
      });
      console.log('✅ SMTP Mail Transporter configured successfully');
    } catch (e) {
      console.error('❌ SMTP configuration failed:', e);
    }
  }
  return mailTransporter;
}

// Database Scheme
interface DatabaseSchema {
  users: User[];
  farms: Farm[];
  plots: FarmPlot[];
  investorPlots: InvestorPlot[];
  assignments: FarmManagerAssignment[];
  updates: FarmUpdate[];
  documents: Document[];
  financials: FinancialSummary[];
  simulatedEmails: SimulatedEmail[];
  settings?: SystemSettings;
}

// Seed helper
function getInitialDb(): DatabaseSchema {
  return {
    users: [
      {
        id: 'user-admin',
        username: 'admin',
        role: UserRole.ADMIN,
        phone: '+2348030012211',
        email: 'admin@adubiaro.com',
        name: 'Basit Ajibade'
      },
      {
        id: 'user-manager1',
        username: 'manager1',
        role: UserRole.FARM_MANAGER,
        phone: '+2348052219088',
        email: 'wale@adubiaro.com',
        name: 'Wale Adeleke'
      },
      {
        id: 'user-investor1',
        username: 'investor1',
        role: UserRole.INVESTOR,
        phone: '+2347012345678',
        email: 'investor1@example.com',
        name: 'Olumide Benson'
      },
      {
        id: 'user-investor2',
        username: 'investor2',
        role: UserRole.INVESTOR,
        phone: '+2348123456789',
        email: 'investor2@example.com',
        name: 'Fatima Yar-Adua'
      }
    ],
    farms: [
      {
        id: 'farm-01',
        name: 'Adubiaro Oil Palm Estate',
        location: 'Ikere-Ekiti',
        state: 'Ekiti State',
        totalPlots: 3,
        totalHectares: 5.3,
        description: 'Premier oil palm estate in Southwest Nigeria. Featuring advanced high-yield tenera hybrid palm trees supported by solar-powered drip irrigation, premium nursery supervision, and state of the art processing milling.',
        coverImage: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=800',
        dateEstablished: '2024-03-15',
        isActive: true
      }
    ],
    plots: [
      {
        id: 'plot-01',
        farmId: 'farm-01',
        plotNumber: 'A-01',
        sizeHectares: 1.5,
        cropType: 'Oil Palm (Tenera Hybrid)',
        status: PlotStatus.ACTIVE
      },
      {
        id: 'plot-02',
        farmId: 'farm-01',
        plotNumber: 'A-02',
        sizeHectares: 2.0,
        cropType: 'Oil Palm (Tenera Hybrid)',
        status: PlotStatus.HARVESTING
      },
      {
        id: 'plot-03',
        farmId: 'farm-01',
        plotNumber: 'B-01',
        sizeHectares: 1.8,
        cropType: 'Oil Palm (Tenera Hybrid)',
        status: PlotStatus.DORMANT
      }
    ],
    investorPlots: [
      {
        id: 'invplot-01',
        investorId: 'user-investor1',
        plotId: 'plot-01',
        investmentAmount: 25000,
        ownershipPercentage: 100,
        startDate: '2025-06-01',
        contractRef: 'CON-2025-01',
        isActive: true
      },
      {
        id: 'invplot-02',
        investorId: 'user-investor1',
        plotId: 'plot-02',
        investmentAmount: 35000,
        ownershipPercentage: 100,
        startDate: '2025-08-12',
        contractRef: 'CON-2025-02',
        isActive: true
      },
      {
        id: 'invplot-03',
        investorId: 'user-investor2',
        plotId: 'plot-03',
        investmentAmount: 28000,
        ownershipPercentage: 100,
        startDate: '2026-01-05',
        contractRef: 'CON-2026-01',
        isActive: true
      }
    ],
    assignments: [
      {
        id: 'assign-01',
        managerId: 'user-manager1',
        farmId: 'farm-01',
        assignedDate: '2024-04-01',
        isActive: true
      }
    ],
    updates: [
      {
        id: 'update-01',
        farmId: 'farm-01',
        postedBy: 'user-manager1',
        postedByName: 'Wale Adeleke',
        title: 'Growth Report — Q1 Progress',
        body: 'We are pleased to report excellent growth across all palm cohorts. Soil testing confirms optimal nutrient retention, and our organic fertilization regimen is on schedule. Rain levels have been supportive.',
        updateType: UpdateType.GROWTH,
        isPublished: true,
        createdAt: '2026-06-01T10:00:00Z',
        photos: [
          {
            id: 'uphoto-1',
            updateId: 'update-01',
            image: 'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&q=80&w=600',
            caption: 'Nursery seedlings transplanting'
          }
        ]
      },
      {
        id: 'update-02',
        farmId: 'farm-01',
        postedBy: 'user-manager1',
        postedByName: 'Wale Adeleke',
        title: 'Harvest Notice — Section A',
        body: 'Harvesting activities have commenced for Block A. Our field workers are harvesting fresh fruit bunches (FFB) yielding an average of 4.2 tons per hectare. Crushing operations have also kicked off at the processing center.',
        updateType: UpdateType.HARVEST,
        isPublished: true,
        createdAt: '2026-06-10T14:30:00Z',
        photos: [
          {
            id: 'uphoto-2',
            updateId: 'update-02',
            image: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=600',
            caption: 'FFB loading'
          }
        ]
      },
      {
        id: 'update-03',
        farmId: 'farm-01',
        postedBy: 'user-admin',
        postedByName: 'Basit Ajibade',
        title: 'Infrastructure Milestone — Irrigation Upgrade',
        body: 'A major milestone has been completed. The solar-powered drip irrigation system is now fully operational across Block B. This will safeguard crop yield integrity during dry spells and dry seasons.',
        updateType: UpdateType.MILESTONE,
        isPublished: true,
        createdAt: '2026-06-14T09:15:00Z',
        photos: []
      }
    ],
    documents: [
      {
        id: 'doc-01',
        farmId: 'farm-01',
        uploadedBy: 'user-admin',
        uploadedByName: 'Basit Ajibade',
        title: 'Environmental Impact Assessment Certificate',
        fileUrl: '#eia-certificate',
        fileName: 'EIA_Certificate_Adubiaro_2024.pdf',
        category: DocumentCategory.CERTIFICATE,
        visibility: DocumentVisibility.FARM,
        description: 'Federal Ministry of Environment clearance certificate demonstrating sustainable ecological practices for Adubiaro Estates.',
        uploadedAt: '2024-05-10T11:00:00Z'
      },
      {
        id: 'doc-02',
        farmId: 'farm-01',
        plotId: 'plot-01',
        uploadedBy: 'user-admin',
        uploadedByName: 'Basit Ajibade',
        title: 'Deed of Farming Contract — Plot A-01',
        fileUrl: '#deed-a-01',
        fileName: 'Contract_A-01_Benson.pdf',
        category: DocumentCategory.CONTRACT,
        visibility: DocumentVisibility.PLOT,
        description: 'Official verified purchase deed and investment contract for Block A-01 owned by Olumide Benson.',
        uploadedAt: '2025-06-02T16:00:00Z'
      }
    ],
    financials: [
      {
        id: 'fin-01',
        plotId: 'plot-01',
        uploadedBy: 'user-admin',
        period: 'Q1',
        year: 2026,
        roiPercentage: 12.5,
        payoutAmount: 3125,
        payoutDate: '2026-04-15',
        status: FinancialStatus.PAID,
        notes: 'First quarter yield payout successfully transferred.'
      },
      {
        id: 'fin-02',
        plotId: 'plot-02',
        uploadedBy: 'user-admin',
        period: 'Q2',
        year: 2026,
        roiPercentage: 8.2,
        payoutAmount: 2870,
        payoutDate: '2026-07-15',
        status: FinancialStatus.PENDING,
        notes: 'Second quarter yield forecast under active auditing.'
      },
      {
        id: 'fin-03',
        plotId: 'plot-03',
        uploadedBy: 'user-admin',
        period: 'Q2',
        year: 2026,
        roiPercentage: 0.0,
        payoutAmount: 0,
        payoutDate: '2026-07-15',
        status: FinancialStatus.PENDING,
        notes: 'Plot under dormant soil rejuvenation cycle. No payout due.'
      }
    ],
    simulatedEmails: [
      {
        id: 'email-01',
        to: 'investor1@example.com',
        subject: 'Welcome to Adubiaro Farm Estates Portal',
        body: 'Welcome Olumide Benson! Your account is set up with username investor1. Use temporary password Investor@1234.',
        htmlBody: `<h3>Welcome to Adubiaro Farm Estates Portal</h3><p>Dear Olumide Benson,</p><p>We are delighted to welcome you to the Adubiaro Farm Estate family!</p><p>Your private investor dashboard is now ready. Use the credentials below to log in and track your high-performance oil palm investments:</p><ul><li><b>Username:</b> investor1</li><li><b>Temporary Password:</b> Investor@1234</li><li><b>Portal URL:</b> <a href="#">Login Here</a></li></ul><p>Our dedicated support desk is available at support@adubiaro.com if you require assistance.</p><p>Warm regards,<br/>Adubiaro Executive Team</p>`,
        sentAt: '2025-06-01T08:00:00Z',
        category: 'Welcome'
      }
    ],
    settings: {
      databaseMode: 'auto',
      simulatedLatency: 0,
      enableNotifications: true,
      enableEmailSimulation: true,
      minimumPayoutRoi: 2.5,
      allowedCrops: ['Oil Palm (Tenera Hybrid)', 'Coconut (Dwarf Hybrid)', 'Cocoa (Amelonado)', 'Cashew (Anacardium Occidental)'],
      portalName: 'Adubiaro Farm Portal',
      logoText: 'ADUBIARO',
      accentColor: 'emerald',
      announcementBanner: '',
      bannerType: 'none'
    }
  };
}

let db: DatabaseSchema = getInitialDb();

// Initialize Firebase Firestore client from config
let firestoreDb: any = null;
try {
  let firebaseConfig: any = null;
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');

  if (process.env.FIREBASE_CONFIG) {
    try {
      firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
      console.log('🔄 Initializing Firebase using FIREBASE_CONFIG environment variable...');
    } catch (err) {
      console.error('❌ Failed to parse FIREBASE_CONFIG environment variable:', err);
    }
  } else if (process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID) {
    console.log('🔄 Initializing Firebase using individual environment variables...');
    firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID
    };
  } else if (fs.existsSync(firebaseConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    console.log('🔄 Initializing Firebase using firebase-applet-config.json file...');
  }

  if (firebaseConfig) {
    const fApp = initializeFirebaseApp(firebaseConfig);
    const dbId = firebaseConfig.firestoreDatabaseId || process.env.FIREBASE_DATABASE_ID || '(default)';
    firestoreDb = initializeFirestore(fApp, {
      experimentalForceLongPolling: true
    }, dbId);
    console.log(`✅ Firebase Firestore client successfully initialized on database: "${dbId}" with long-polling force enablement.`);
  } else {
    console.warn('⚠️ No Firebase configuration found (neither env vars nor JSON config). Firestore cloud backing disabled.');
  }
} catch (e) {
  console.error('❌ Failed to initialize Firebase Firestore:', e);
}

// Helper to load complete memory db state from Firestore collections
async function loadDbFromFirestore() {
  if (!firestoreDb) return;
  console.log('🔄 Loading persisted state from Firebase Firestore...');
  try {
    const collectionsToLoad = [
      { name: 'users', key: 'users' },
      { name: 'farms', key: 'farms' },
      { name: 'plots', key: 'plots' },
      { name: 'investorPlots', key: 'investorPlots' },
      { name: 'assignments', key: 'assignments' },
      { name: 'updates', key: 'updates' },
      { name: 'documents', key: 'documents' },
      { name: 'financials', key: 'financials' },
      { name: 'simulatedEmails', key: 'simulatedEmails' }
    ];

    let loadedSomething = false;
    for (const col of collectionsToLoad) {
      const querySnapshot = await getDocs(collection(firestoreDb, col.name));
      const items: any[] = [];
      querySnapshot.forEach((docSnapshot) => {
        items.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });
      if (items.length > 0) {
        (db as any)[col.key] = items;
        loadedSomething = true;
      } else {
        (db as any)[col.key] = [];
      }
    }

    // Load settings
    const settingsDoc = await getDoc(doc(firestoreDb, 'settings', 'standalone'));
    if (settingsDoc.exists()) {
      db.settings = settingsDoc.data() as SystemSettings;
      loadedSomething = true;
    }

    if (loadedSomething) {
      console.log('✅ Loaded data successfully from Firestore!');
    } else {
      console.log('ℹ️ Firestore database is empty.');
    }
  } catch (err) {
    console.error('❌ Error reading from Firestore:', err);
  }
}

// Helper to fully synchronize memory DB state to corresponding Firestore paths
async function saveDbToFirestore() {
  if (!firestoreDb) return;
  try {
    const collectionsToSave = [
      { name: 'users', list: db.users },
      { name: 'farms', list: db.farms },
      { name: 'plots', list: db.plots },
      { name: 'investorPlots', list: db.investorPlots },
      { name: 'assignments', list: db.assignments },
      { name: 'updates', list: db.updates },
      { name: 'documents', list: db.documents },
      { name: 'financials', list: db.financials },
      { name: 'simulatedEmails', list: db.simulatedEmails }
    ];

    for (const col of collectionsToSave) {
      for (const item of col.list) {
        if (item && item.id) {
          const { id, ...data } = item;
          // Prevent setting undefined values in Firestore
          const cleanData = JSON.parse(JSON.stringify(data));
          await setDoc(doc(firestoreDb, col.name, item.id), cleanData);
        }
      }
    }

    if (db.settings) {
      const cleanSettings = JSON.parse(JSON.stringify(db.settings));
      await setDoc(doc(firestoreDb, 'settings', 'standalone'), cleanSettings);
    }
    console.log('✅ Synchronized memory DB state to Firestore successfully.');
  } catch (err) {
    console.error('❌ Error synchronizing memory DB to Firestore:', err);
  }
}

async function initFirestore() {
  if (!firestoreDb) return;
  try {
    await loadDbFromFirestore();
    
    // Check if db is completely empty
    if (db.users.length === 0) {
      console.log('🌱 Firestore is empty. Initializing and seeding Firestore database...');
      db = getInitialDb();
      await saveDbToFirestore();
      console.log('✅ Firestore seeded successfully.');
    }
  } catch (err) {
    console.error('❌ Failed to initialize/sync Firestore database:', err);
  }
}

function getSettings(): SystemSettings {
  if (!db.settings) {
    db.settings = {
      databaseMode: 'auto',
      simulatedLatency: 0,
      enableNotifications: true,
      enableEmailSimulation: true,
      minimumPayoutRoi: 2.5,
      allowedCrops: ['Oil Palm (Tenera Hybrid)', 'Coconut (Dwarf Hybrid)', 'Cocoa (Amelonado)', 'Cashew (Anacardium Occidental)'],
      portalName: 'Adubiaro Farm Portal',
      logoText: 'ADUBIARO',
      accentColor: 'emerald',
      announcementBanner: '',
      bannerType: 'none'
    };
  }
  return db.settings;
}

let pgPool: pg.Pool | null = null;
let usePostgres = false;
let postgresError: string | null = null;

// Helpers to map rows from PostgreSQL to TypeScript structures
function mapUserFromDb(row: any): User {
  return {
    id: row.id,
    username: row.username,
    role: row.role as UserRole,
    phone: row.phone || undefined,
    email: row.email,
    name: row.name
  };
}

function mapFarmFromDb(row: any): Farm {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    state: row.state,
    totalPlots: Number(row.total_plots || 0),
    totalHectares: Number(row.total_hectares || 0),
    description: row.description || '',
    coverImage: row.cover_image || '',
    dateEstablished: row.date_established || '',
    isActive: Boolean(row.is_active)
  };
}

function mapPlotFromDb(row: any): FarmPlot {
  return {
    id: row.id,
    farmId: row.farm_id,
    plotNumber: row.plot_number,
    sizeHectares: Number(row.size_hectares || 0),
    cropType: row.crop_type,
    status: row.status as PlotStatus
  };
}

function mapInvestorPlotFromDb(row: any): InvestorPlot {
  return {
    id: row.id,
    investorId: row.investor_id,
    plotId: row.plot_id,
    investmentAmount: Number(row.investment_amount || 0),
    ownershipPercentage: Number(row.ownership_percentage || 100),
    startDate: row.start_date,
    contractRef: row.contract_ref || '',
    isActive: Boolean(row.is_active)
  };
}

function mapAssignmentFromDb(row: any): FarmManagerAssignment {
  return {
    id: row.id,
    managerId: row.manager_id,
    farmId: row.farm_id,
    assignedDate: row.assigned_date,
    isActive: Boolean(row.is_active)
  };
}

function mapUpdateFromDb(row: any): FarmUpdate {
  let targetInvestorIds: string[] = [];
  if (row.target_investor_ids) {
    targetInvestorIds = Array.isArray(row.target_investor_ids)
      ? row.target_investor_ids
      : typeof row.target_investor_ids === 'string'
        ? JSON.parse(row.target_investor_ids)
        : JSON.parse(JSON.stringify(row.target_investor_ids));
  }
  let photos: any[] = [];
  if (row.photos) {
    photos = Array.isArray(row.photos)
      ? row.photos
      : typeof row.photos === 'string'
        ? JSON.parse(row.photos)
        : JSON.parse(JSON.stringify(row.photos));
  }
  return {
    id: row.id,
    farmId: row.farm_id,
    postedBy: row.posted_by,
    postedByName: row.posted_by_name,
    title: row.title,
    body: row.body,
    updateType: row.update_type as UpdateType,
    targetInvestorIds,
    isPublished: Boolean(row.is_published),
    createdAt: row.created_at,
    photos
  };
}

function mapDocumentFromDb(row: any): Document {
  return {
    id: row.id,
    farmId: row.farm_id,
    plotId: row.plot_id || undefined,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by_name,
    title: row.title,
    fileUrl: row.file_url,
    fileName: row.file_name,
    category: row.category as DocumentCategory,
    visibility: row.visibility as DocumentVisibility,
    description: row.description || undefined,
    uploadedAt: row.uploaded_at
  };
}

function mapFinancialFromDb(row: any): FinancialSummary {
  return {
    id: row.id,
    plotId: row.plot_id,
    uploadedBy: row.uploaded_by,
    period: row.period,
    year: Number(row.year),
    roiPercentage: Number(row.roi_percentage || 0),
    payoutAmount: Number(row.payout_amount || 0),
    payoutDate: row.payout_date,
    status: row.status as FinancialStatus,
    notes: row.notes || undefined
  };
}

function mapSimulatedEmailFromDb(row: any): SimulatedEmail {
  return {
    id: row.id,
    to: row.to_address,
    subject: row.subject,
    body: row.body,
    htmlBody: row.html_body,
    sentAt: row.sent_at,
    category: row.category
  };
}

// Truncates all PostgreSQL tables (used primarily during database reset command)
async function resetPostgresDb() {
  if (!pgPool) return;
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE simulated_emails, financials, documents, updates, assignments, investor_plots, plots, farms, users CASCADE;');
    await client.query('COMMIT');
    console.log('✅ Truncated all PostgreSQL tables prior to seed restore.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to truncate PostgreSQL tables during reset:', err);
  } finally {
    client.release();
  }
}

// Clears all non-admin data for a production clean slate
async function clearAllButAdminPostgres() {
  if (!pgPool) return;
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    await client.query("DELETE FROM users WHERE role != 'ADMIN';");
    await client.query('TRUNCATE TABLE simulated_emails, financials, documents, updates, assignments, investor_plots, plots, farms CASCADE;');
    await client.query('COMMIT');
    console.log('✅ Cleared all non-admin records in PostgreSQL for clean slate.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to clean PostgreSQL tables for clear slate:', err);
  } finally {
    client.release();
  }
}

// Synchronize in-memory changes with PostgreSQL database tables using upserts
async function saveDbToPostgres() {
  if (!pgPool) return;

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    // 1. Synchronize Users
    for (const user of db.users) {
      await client.query(
        `INSERT INTO users (id, username, role, phone, email, name)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           role = EXCLUDED.role,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           name = EXCLUDED.name`,
        [user.id, user.username, user.role, user.phone || null, user.email, user.name]
      );
    }

    // 2. Synchronize Farms
    for (const farm of db.farms) {
      await client.query(
        `INSERT INTO farms (id, name, location, state, total_plots, total_hectares, description, cover_image, date_established, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           location = EXCLUDED.location,
           state = EXCLUDED.state,
           total_plots = EXCLUDED.total_plots,
           total_hectares = EXCLUDED.total_hectares,
           description = EXCLUDED.description,
           cover_image = EXCLUDED.cover_image,
           date_established = EXCLUDED.date_established,
           is_active = EXCLUDED.is_active`,
        [farm.id, farm.name, farm.location, farm.state, farm.totalPlots, farm.totalHectares, farm.description || null, farm.coverImage || null, farm.dateEstablished || null, farm.isActive]
      );
    }

    // 3. Synchronize Plots
    for (const plot of db.plots) {
      await client.query(
        `INSERT INTO plots (id, farm_id, plot_number, size_hectares, crop_type, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           farm_id = EXCLUDED.farm_id,
           plot_number = EXCLUDED.plot_number,
           size_hectares = EXCLUDED.size_hectares,
           crop_type = EXCLUDED.crop_type,
           status = EXCLUDED.status`,
        [plot.id, plot.farmId, plot.plotNumber, plot.sizeHectares, plot.cropType, plot.status]
      );
    }

    // 4. Synchronize Investor Plots
    for (const ip of db.investorPlots) {
      await client.query(
        `INSERT INTO investor_plots (id, investor_id, plot_id, investment_amount, ownership_percentage, start_date, contract_ref, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           investor_id = EXCLUDED.investor_id,
           plot_id = EXCLUDED.plot_id,
           investment_amount = EXCLUDED.investment_amount,
           ownership_percentage = EXCLUDED.ownership_percentage,
           start_date = EXCLUDED.start_date,
           contract_ref = EXCLUDED.contract_ref,
           is_active = EXCLUDED.is_active`,
        [ip.id, ip.investorId, ip.plotId, ip.investmentAmount, ip.ownershipPercentage, ip.startDate, ip.contractRef || null, ip.isActive]
      );
    }

    // 5. Synchronize Assignments
    for (const assign of db.assignments) {
      await client.query(
        `INSERT INTO assignments (id, manager_id, farm_id, assigned_date, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           manager_id = EXCLUDED.manager_id,
           farm_id = EXCLUDED.farm_id,
           assigned_date = EXCLUDED.assigned_date,
           is_active = EXCLUDED.is_active`,
        [assign.id, assign.managerId, assign.farmId, assign.assignedDate, assign.isActive]
      );
    }

    // 6. Synchronize Updates
    for (const up of db.updates) {
      await client.query(
        `INSERT INTO updates (id, farm_id, posted_by, posted_by_name, title, body, update_type, target_investor_ids, is_published, created_at, photos)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           farm_id = EXCLUDED.farm_id,
           posted_by = EXCLUDED.posted_by,
           posted_by_name = EXCLUDED.posted_by_name,
           title = EXCLUDED.title,
           body = EXCLUDED.body,
           update_type = EXCLUDED.update_type,
           target_investor_ids = EXCLUDED.target_investor_ids,
           is_published = EXCLUDED.is_published,
           created_at = EXCLUDED.created_at,
           photos = EXCLUDED.photos`,
        [up.id, up.farmId, up.postedBy, up.postedByName, up.title, up.body, up.updateType, JSON.stringify(up.targetInvestorIds || []), up.isPublished, up.createdAt, JSON.stringify(up.photos || [])]
      );
    }

    // 7. Synchronize Documents
    for (const doc of db.documents) {
      await client.query(
        `INSERT INTO documents (id, farm_id, plot_id, uploaded_by, uploaded_by_name, title, file_url, file_name, category, visibility, description, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           farm_id = EXCLUDED.farm_id,
           plot_id = EXCLUDED.plot_id,
           uploaded_by = EXCLUDED.uploaded_by,
           uploaded_by_name = EXCLUDED.uploaded_by_name,
           title = EXCLUDED.title,
           file_url = EXCLUDED.file_url,
           file_name = EXCLUDED.file_name,
           category = EXCLUDED.category,
           visibility = EXCLUDED.visibility,
           description = EXCLUDED.description,
           uploaded_at = EXCLUDED.uploaded_at`,
        [doc.id, doc.farmId, doc.plotId || null, doc.uploadedBy, doc.uploadedByName, doc.title, doc.fileUrl, doc.fileName, doc.category, doc.visibility, doc.description || null, doc.uploadedAt]
      );
    }

    // 8. Synchronize Financials
    for (const fin of db.financials) {
      await client.query(
        `INSERT INTO financials (id, plot_id, uploaded_by, period, year, roi_percentage, payout_amount, payout_date, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           plot_id = EXCLUDED.plot_id,
           uploaded_by = EXCLUDED.uploaded_by,
           period = EXCLUDED.period,
           year = EXCLUDED.year,
           roi_percentage = EXCLUDED.roi_percentage,
           payout_amount = EXCLUDED.payout_amount,
           payout_date = EXCLUDED.payout_date,
           status = EXCLUDED.status,
           notes = EXCLUDED.notes`,
        [fin.id, fin.plotId, fin.uploadedBy, fin.period, fin.year, fin.roiPercentage, fin.payoutAmount, fin.payoutDate, fin.status, fin.notes || null]
      );
    }

    // 9. Synchronize Simulated Emails
    for (const email of db.simulatedEmails) {
      await client.query(
        `INSERT INTO simulated_emails (id, to_address, subject, body, html_body, sent_at, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           to_address = EXCLUDED.to_address,
           subject = EXCLUDED.subject,
           body = EXCLUDED.body,
           html_body = EXCLUDED.html_body,
           sent_at = EXCLUDED.sent_at,
           category = EXCLUDED.category`,
        [email.id, email.to, email.subject, email.body, email.htmlBody, email.sentAt, email.category]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Synchronized memory database state to PostgreSQL successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to sync memory database to PostgreSQL:', err);
  } finally {
    client.release();
  }
}

// Fallback logic for reading local db.json
function loadLocalJsonDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      console.log('✅ Local JSON Database loaded successfully from file');
    } catch (e) {
      db = getInitialDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    }
  } else {
    db = getInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
}

// Helper to verify if PostgreSQL is actively configured and has a valid URL
function isPostgresConfigured(): boolean {
  const dbUrl = process.env.DATABASE_URL;
  return !!(dbUrl && 
    dbUrl !== 'undefined' && 
    dbUrl !== 'null' && 
    dbUrl.trim() && 
    dbUrl !== 'YOUR_DATABASE_URL' && 
    dbUrl !== 'DATABASE_URL_HERE' &&
    !dbUrl.includes('db.example.com'));
}

// Main integration initialization for PostgreSQL
async function initPostgres() {
  // Load local database config first to determine settings-based overrides
  loadLocalJsonDb();

  const settings = getSettings();
  if (settings.databaseMode === 'local_json') {
    console.log('⚠️ Forced local JSON database mode via Super Admin settings. Bypassing PostgreSQL.');
    usePostgres = false;
    return;
  }

  if (!isPostgresConfigured()) {
    console.log('💡 DATABASE_URL not set or set to dummy value. Running in local JSON file mode.');
    usePostgres = false;
    return;
  }


  try {
    console.log('🔌 Connecting to PostgreSQL database...');
    let hasConnected = false;
    
    try {
      pgPool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
      // Verify connections
      const client = await pgPool.connect();
      console.log('🚀 Connected to PostgreSQL successfully (SSL mode enabled)!');
      client.release();
      hasConnected = true;
    } catch (sslErr: any) {
      console.log(`⚠️ PostgreSQL SSL connection failed: ${sslErr.message}. Retrying with completely disabled SSL...`);
      // Clean up the SSL-configured pool
      if (pgPool) {
        await pgPool.end().catch(() => {});
      }
      
      // Remove any SSL-related query options from connectionString to prevent drivers from forcing SSL
      let cleanDbUrl = process.env.DATABASE_URL || '';
      try {
        const parsedUrl = new URL(cleanDbUrl);
        parsedUrl.searchParams.delete('sslmode');
        parsedUrl.searchParams.delete('ssl');
        parsedUrl.searchParams.delete('sslfactory');
        cleanDbUrl = parsedUrl.toString();
      } catch (urlErr) {
        // Simple regex fallback if connection URL isn't standard/parseable by new URL()
        cleanDbUrl = cleanDbUrl
          .replace(/[?&]sslmode=[^&]+/g, '')
          .replace(/[?&]ssl=[^&]+/g, '')
          .replace(/[?&]sslfactory=[^&]+/g, '');
      }

      pgPool = new pg.Pool({
        connectionString: cleanDbUrl,
        ssl: false
      });
      // Verify connection in non-SSL mode
      const client = await pgPool.connect();
      console.log('🚀 Connected to PostgreSQL successfully (SSL mode completely disabled)!');
      client.release();
      hasConnected = true;
    }

    if (!hasConnected) {
      throw new Error('All database connection strategies exhausted.');
    }

    usePostgres = true;

    // Build the schema if not existing
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        role VARCHAR(50) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(100) NOT NULL,
        name VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS farms (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        location VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        total_plots INT DEFAULT 0,
        total_hectares DOUBLE PRECISION DEFAULT 0.0,
        description TEXT,
        cover_image TEXT,
        date_established VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS plots (
        id VARCHAR(50) PRIMARY KEY,
        farm_id VARCHAR(50) NOT NULL,
        plot_number VARCHAR(50) NOT NULL,
        size_hectares DOUBLE PRECISION NOT NULL,
        crop_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS investor_plots (
        id VARCHAR(50) PRIMARY KEY,
        investor_id VARCHAR(50) NOT NULL,
        plot_id VARCHAR(50) NOT NULL,
        investment_amount DOUBLE PRECISION NOT NULL,
        ownership_percentage DOUBLE PRECISION DEFAULT 100,
        start_date VARCHAR(50) NOT NULL,
        contract_ref VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(50) PRIMARY KEY,
        manager_id VARCHAR(50) NOT NULL,
        farm_id VARCHAR(50) NOT NULL,
        assigned_date VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS updates (
        id VARCHAR(50) PRIMARY KEY,
        farm_id VARCHAR(50) NOT NULL,
        posted_by VARCHAR(50) NOT NULL,
        posted_by_name VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        update_type VARCHAR(50) NOT NULL,
        target_investor_ids JSONB DEFAULT '[]',
        is_published BOOLEAN DEFAULT TRUE,
        created_at VARCHAR(100) NOT NULL,
        photos JSONB DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(50) PRIMARY KEY,
        farm_id VARCHAR(50) NOT NULL,
        plot_id VARCHAR(50),
        uploaded_by VARCHAR(50) NOT NULL,
        uploaded_by_name VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        visibility VARCHAR(50) NOT NULL,
        description TEXT,
        uploaded_at VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS financials (
        id VARCHAR(50) PRIMARY KEY,
        plot_id VARCHAR(50) NOT NULL,
        uploaded_by VARCHAR(50) NOT NULL,
        period VARCHAR(50) NOT NULL,
        year INT NOT NULL,
        roi_percentage DOUBLE PRECISION DEFAULT 0.0,
        payout_amount DOUBLE PRECISION DEFAULT 0.0,
        payout_date VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS simulated_emails (
        id VARCHAR(50) PRIMARY KEY,
        to_address VARCHAR(100) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        html_body TEXT NOT NULL,
        sent_at VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL
      );
    `);

    // Run empty-check for seeding
    const userCountResult = await pgPool.query('SELECT COUNT(*) FROM users;');
    const userCount = parseInt(userCountResult.rows[0].count);

    if (userCount === 0) {
      console.log('🌱 PostgreSQL database is empty. Seeding from fallback values...');
      let initialData: DatabaseSchema;
      try {
        if (fs.existsSync(DB_FILE)) {
          initialData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        } else {
          initialData = getInitialDb();
        }
      } catch (err) {
        initialData = getInitialDb();
      }

      // Seed core DB structures
      db = initialData;
      await saveDbToPostgres();
      console.log('✅ PostgreSQL seeding completed successfully!');
    }

    // Retrieve database state
    console.log('🔄 Loading persisted state from PostgreSQL tables...');
    const usersRes = await pgPool.query('SELECT * FROM users;');
    const farmsRes = await pgPool.query('SELECT * FROM farms;');
    const plotsRes = await pgPool.query('SELECT * FROM plots;');
    const investorPlotsRes = await pgPool.query('SELECT * FROM investor_plots;');
    const assignmentsRes = await pgPool.query('SELECT * FROM assignments;');
    const updatesRes = await pgPool.query('SELECT * FROM updates;');
    const documentsRes = await pgPool.query('SELECT * FROM documents;');
    const financialsRes = await pgPool.query('SELECT * FROM financials;');
    const emailsRes = await pgPool.query('SELECT * FROM simulated_emails ORDER BY sent_at DESC;');

    db = {
      users: usersRes.rows.map(mapUserFromDb),
      farms: farmsRes.rows.map(mapFarmFromDb),
      plots: plotsRes.rows.map(mapPlotFromDb),
      investorPlots: investorPlotsRes.rows.map(mapInvestorPlotFromDb),
      assignments: assignmentsRes.rows.map(mapAssignmentFromDb),
      updates: updatesRes.rows.map(mapUpdateFromDb),
      documents: documentsRes.rows.map(mapDocumentFromDb),
      financials: financialsRes.rows.map(mapFinancialFromDb),
      simulatedEmails: emailsRes.rows.map(mapSimulatedEmailFromDb)
    };

    postgresError = null;
    console.log(`✅ Loaded ${db.users.length} users, ${db.farms.length} estates, ${db.plots.length} plots from PostgreSQL!`);
  } catch (err: any) {
    usePostgres = false;
    postgresError = err instanceof Error ? err.stack || err.message : String(err);
    
    const settings = getSettings();
    if (settings.databaseMode === 'postgres_forced') {
      console.error('❌ Failed to initialize PostgreSQL connection in FORCED database mode:', err);
    } else {
      console.log(`💡 Note: PostgreSQL is not reachable, seamlessly continuing in persistent Cloud/Local database mode: ${err.message || err}`);
    }
    // Fall back to local JSON file only if Firestore failed to retrieve any user data
    if (db.users.length === 0) {
      loadLocalJsonDb();
    }
  }
}

function saveDb() {
  // Always maintain an active local JSON backup file
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('❌ Failed to save local file-based DB copy:', err);
  }

  // Push updates to Firestore
  if (firestoreDb) {
    saveDbToFirestore().catch(err => {
      console.error('❌ Failed to synchronize database changes with Firestore:', err);
    });
  }

  // Push updates to PostgreSQL if activated
  if (usePostgres && pgPool) {
    saveDbToPostgres().catch(err => {
      console.error('❌ Failed to synchronize database changes with PostgreSQL:', err);
    });
  }
}

// Simulated real-time triggers for notification emails
async function dispatchEmail(to: string, subject: string, textBody: string, htmlBody: string, category: string) {
  const settings = getSettings();
  if (!settings.enableEmailSimulation) {
    console.log('🔇 Email simulation disabled by Super Admin. Bypassing email dispatch.');
    return;
  }

  // 1. Appends to internal simulated log
  const newEmail: SimulatedEmail = {
    id: 'email-' + Date.now().toString(),
    to,
    subject,
    body: textBody,
    htmlBody,
    sentAt: new Date().toISOString(),
    category
  };
  db.simulatedEmails.unshift(newEmail);
  saveDb();

  // 2. Tries lazy real SMTP send
  const transporter = getMailTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.DEFAULT_FROM_EMAIL || 'Adubiaro Farms <noreply@adubiaro.com>',
        to,
        subject,
        text: textBody,
        html: htmlBody
      });
      console.log(`📧 Fully routed REAL SMTP Email to ${to}: ${subject}`);
    } catch (e) {
      console.error('📧 SMTP Send issue (skipping, logged in simulated outbox):', e);
    }
  } else {
    console.log(`📧 Simulated Email recorded in outbox to ${to}: ${subject}`);
  }
}

// AUTHENTICATION MIDDLEWARE
function getAuthenticatedUser(req: express.Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer mock-token-')) {
    return null;
  }
  const username = authHeader.replace('Bearer mock-token-', '').trim();
  const foundUser = db.users.find(u => u.username === username);
  return foundUser || null;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  // Attach user to req as custom property
  (req as any).user = user;
  next();
}

// API ROUTING

// Auth - Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Accept standard demo passwords
  const user = db.users.find(u => u.username === username);
  if (!user) {
    return res.status(400).json({ error: 'Invalid login credentials' });
  }

  let isMatch = false;
  if (user.role === UserRole.ADMIN && password === 'Admin@1234') isMatch = true;
  if (user.role === UserRole.FARM_MANAGER && password === 'Manager@1234') isMatch = true;
  if (user.role === UserRole.INVESTOR && password === 'Investor@1234') isMatch = true;

  if (!isMatch) {
    return res.status(400).json({ error: 'Invalid login credentials' });
  }

  const token = `mock-token-${user.username}`;
  res.json({ token, user });
});

// Auth - Current User Status
app.get('/api/user/me', requireAuth, (req, res) => {
  res.json({ user: (req as any).user });
});

// Admin System Stats Dashboard
app.get('/api/admin/system-stats', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const totalInvestors = db.users.filter(u => u.role === UserRole.INVESTOR).length;
  const totalManagers = db.users.filter(u => u.role === UserRole.FARM_MANAGER).length;
  const totalFarms = db.farms.length;
  const totalActiveFarms = db.farms.filter(f => f.isActive).length;
  const totalPlotsCount = db.plots.length;
  
  // Calculate total investments
  const totalInvestment = db.investorPlots.reduce((sum, p) => sum + p.investmentAmount, 0);
  const totalActiveInvestmentCount = db.investorPlots.filter(ip => ip.isActive).length;
  const totalActiveInvestmentAmount = db.investorPlots.filter(ip => ip.isActive).reduce((sum, p) => sum + p.investmentAmount, 0);
  
  // Calculate total paid and pending payouts
  let totalPaidPayouts = 0;
  let totalPendingPayouts = 0;
  db.financials.forEach(fin => {
    if (fin.status === FinancialStatus.PAID) {
      totalPaidPayouts += fin.payoutAmount;
    } else if (fin.status === FinancialStatus.PENDING) {
      totalPendingPayouts += fin.payoutAmount;
    }
  });

  // Calculate payouts this month
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  let totalPayoutsThisMonth = 0;
  db.financials.forEach(fin => {
    if (fin.payoutDate) {
      const pDate = new Date(fin.payoutDate);
      if (!isNaN(pDate.getTime()) && pDate.getFullYear() === curYear && pDate.getMonth() === curMonth) {
        totalPayoutsThisMonth += fin.payoutAmount;
      }
    }
  });

  res.json({
    totalInvestors,
    totalManagers,
    totalFarms,
    totalActiveFarms,
    totalPlotsCount,
    totalInvestment,
    totalActiveInvestmentCount,
    totalActiveInvestmentAmount,
    totalPaidPayouts,
    totalPendingPayouts,
    totalPayoutsThisMonth
  });
});

// List Farms (Filtered according to roles)
app.get('/api/farms', requireAuth, (req, res) => {
  const user = (req as any).user as User;

  if (user.role === UserRole.ADMIN) {
    return res.json(db.farms);
  }

  if (user.role === UserRole.FARM_MANAGER) {
    // Get farms assigned to this manager
    const assignedFarmIds = db.assignments
      .filter(a => a.managerId === user.id && a.isActive)
      .map(a => a.farmId);
    const assignedFarms = db.farms.filter(f => assignedFarmIds.includes(f.id));
    return res.json(assignedFarms);
  }

  if (user.role === UserRole.INVESTOR) {
    // Get farms where investor owns plots
    const investorPlotsList = db.investorPlots.filter(ip => ip.investorId === user.id && ip.isActive);
    const plotIds = investorPlotsList.map(ip => ip.plotId);
    const ownedPlotFarms = db.plots.filter(p => plotIds.includes(p.id)).map(p => p.farmId);
    const ownedFarms = db.farms.filter(f => ownedPlotFarms.includes(f.id));
    return res.json(ownedFarms);
  }

  res.json([]);
});

// Single Farm Details API (with Updates, Documents, Plots checked cleanly)
app.get('/api/farms/:id', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const farmId = req.params.id;

  const farm = db.farms.find(f => f.id === farmId);
  if (!farm) {
    return res.status(404).json({ error: 'Farm not found' });
  }

  // 1. Roles access boundary check
  let accessAllowed = false;
  let assignedAsManager = false;

  if (user.role === UserRole.ADMIN) {
    accessAllowed = true;
  } else if (user.role === UserRole.FARM_MANAGER) {
    assignedAsManager = db.assignments.some(
      a => a.managerId === user.id && a.farmId === farmId && a.isActive
    );
    if (assignedAsManager) {
      accessAllowed = true;
    }
  } else if (user.role === UserRole.INVESTOR) {
    const investorPlotsList = db.investorPlots.filter(ip => ip.investorId === user.id && ip.isActive);
    const plotIds = investorPlotsList.map(ip => ip.plotId);
    const ownsPlotInFarm = db.plots.some(p => p.farmId === farmId && plotIds.includes(p.id));
    if (ownsPlotInFarm) {
      accessAllowed = true;
    }
  }

  if (!accessAllowed) {
    return res.status(403).json({ error: 'Access denied to this farm estate' });
  }

  // 2. Gather plots
  let plots = db.plots.filter(p => p.farmId === farmId);
  // If role is investor, format/filter plots so they only see details of their owned plots
  if (user.role === UserRole.INVESTOR) {
    const investorPlotsList = db.investorPlots.filter(ip => ip.investorId === user.id && ip.isActive);
    const plotIds = investorPlotsList.map(ip => ip.plotId);
    plots = plots.filter(p => plotIds.includes(p.id));
  }

  // 3. Gather updates
  let updates = db.updates.filter(u => u.farmId === farmId && u.isPublished);
  if (user.role === UserRole.INVESTOR) {
    updates = updates.filter(u => {
      return !u.targetInvestorIds || u.targetInvestorIds.length === 0 || u.targetInvestorIds.includes(user.id);
    });
  }

  // 4. Gather documents
  let documents = db.documents.filter(d => d.farmId === farmId);
  if (user.role === UserRole.FARM_MANAGER) {
    // Farm managers can see documents in general, but since they shouldn't see sensitive financials, they filter those categories
    documents = documents.filter(d => d.category !== DocumentCategory.FINANCIAL);
  } else if (user.role === UserRole.INVESTOR) {
    // Investors can see farm-wide, or specific plot documents matching their holdings
    const investorPlotsList = db.investorPlots.filter(ip => ip.investorId === user.id && ip.isActive);
    const plotIds = investorPlotsList.map(ip => ip.plotId);
    documents = documents.filter(
      d => d.visibility === DocumentVisibility.FARM || (d.plotId && plotIds.includes(d.plotId))
    );
  }

  // Gather plot investment details for investors / admin
  let investorHoldings: any[] = [];
  if (user.role === UserRole.INVESTOR) {
    const holdings = db.investorPlots.filter(ip => ip.investorId === user.id && ip.isActive);
    investorHoldings = holdings.map(h => {
      const p = db.plots.find(plot => plot.id === h.plotId);
      return {
        ...h,
        plotNumber: p?.plotNumber,
        cropType: p?.cropType,
        sizeHectares: p?.sizeHectares
      };
    });
  } else if (user.role === UserRole.ADMIN) {
    // Admin sees all plot ownerships
    const holdings = db.investorPlots.filter(ip => ip.isActive);
    investorHoldings = holdings.map(h => {
      const p = db.plots.find(plot => plot.id === h.plotId);
      const investorName = db.users.find(u => u.id === h.investorId)?.name || 'Unknown';
      return {
        ...h,
        plotNumber: p?.plotNumber,
        cropType: p?.cropType,
        investorName
      };
    });
  }

  res.json({
    farm,
    plots,
    updates,
    documents,
    investorHoldings
  });
});

// List investors of a farm (Admin/Manager assigned only)
app.get('/api/farms/:id/investors', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const farmId = req.params.id;

  let authorized = false;
  if (user.role === UserRole.ADMIN) {
    authorized = true;
  } else if (user.role === UserRole.FARM_MANAGER) {
    authorized = db.assignments.some(
      a => a.managerId === user.id && a.farmId === farmId && a.isActive
    );
  }

  if (!authorized) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Find all plots belonging to the farm
  const farmPlots = db.plots.filter(p => p.farmId === farmId);
  const farmPlotIds = farmPlots.map(p => p.id);

  // Find all active investorPlot relationships mapping to those plots
  const ownerships = db.investorPlots.filter(ip => farmPlotIds.includes(ip.plotId) && ip.isActive);
  const investorIds = [...new Set(ownerships.map(ip => ip.investorId))];

  // Map to distinct users who are investors
  const investors = db.users.filter(u => u.role === UserRole.INVESTOR && investorIds.includes(u.id));
  res.json(investors);
});

// Post farm update (Admin/Manager assigned only)
app.post('/api/updates/farm/:id/new', requireAuth, upload.array('photos', 5), async (req, res) => {
  const user = (req as any).user as User;
  const farmId = req.params.id;
  const { title, body, updateType } = req.body;

  let targetInvestorIds: string[] = [];
  if (req.body.targetInvestorIds) {
    if (typeof req.body.targetInvestorIds === 'string') {
      try {
        targetInvestorIds = JSON.parse(req.body.targetInvestorIds);
      } catch (e) {
        targetInvestorIds = req.body.targetInvestorIds.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(req.body.targetInvestorIds)) {
      targetInvestorIds = req.body.targetInvestorIds;
    }
  }

  const farm = db.farms.find(f => f.id === farmId);
  if (!farm) {
    return res.status(404).json({ error: 'Farm not found' });
  }

  let authorized = false;
  if (user.role === UserRole.ADMIN) {
    authorized = true;
  } else if (user.role === UserRole.FARM_MANAGER) {
    authorized = db.assignments.some(
      a => a.managerId === user.id && a.farmId === farmId && a.isActive
    );
  }

  if (!authorized) {
    return res.status(403).json({ error: 'Not authorized to post updates for this farm' });
  }

  const uploadedFiles = (req.files as Express.Multer.File[]) || [];
  const updatePhotosList: any[] = [];
  const updateId = 'update-' + Date.now();

  const cld = getCloudinary();
  for (let i = 0; i < uploadedFiles.length; i++) {
    const file = uploadedFiles[i];
    let fileUrl = `/uploads/${file.filename}`;

    if (process.env.CLOUDINARY_URL) {
      try {
        const cldRes = await cld.uploader.upload(file.path, {
          folder: 'farm_estate_updates'
        });
        fileUrl = cldRes.secure_url;
        // Clean local temp file
        fs.unlinkSync(file.path);
      } catch (e) {
        console.error('Cloudinary upload failure, using local route instead', e);
      }
    }

    updatePhotosList.push({
      id: `uphoto-${updateId}-${i}`,
      updateId,
      image: fileUrl,
      caption: req.body.captions?.[i] || ''
    });
  }

  const newUpdate: FarmUpdate = {
    id: updateId,
    farmId,
    postedBy: user.id,
    postedByName: user.name,
    title,
    body,
    updateType: (updateType as UpdateType) || UpdateType.GENERAL,
    targetInvestorIds,
    isPublished: true,
    createdAt: new Date().toISOString(),
    photos: updatePhotosList
  };

  db.updates.unshift(newUpdate);
  saveDb();

  // EMAIL TRIGGER 1: New farm update posted → email all investors who own plots in that farm (or selected target ones if personalized)
  const investorPlotsOnFarm = db.plots.filter(p => p.farmId === farmId);
  const investorIdsOnFarm = db.investorPlots
    .filter(ip => ip.isActive && investorPlotsOnFarm.some(p => p.id === ip.plotId))
    .map(ip => ip.investorId);
  
  const distinctInvestors = db.users.filter(u => u.role === UserRole.INVESTOR && investorIdsOnFarm.includes(u.id));

  let finalNotifiedInvestors = distinctInvestors;
  if (targetInvestorIds && targetInvestorIds.length > 0) {
    finalNotifiedInvestors = distinctInvestors.filter(u => targetInvestorIds.includes(u.id));
  }

  // Dispatch emails asynchronously
  finalNotifiedInvestors.forEach(investor => {
    dispatchEmail(
      investor.email,
      `New Update: ${farm.name} — ${newUpdate.title}`,
      `Hello ${investor.name},\n\nA new farm update has been posted:\nType: ${newUpdate.updateType}\nDate: ${new Date(newUpdate.createdAt).toLocaleDateString()}\n\nSummary:\n${newUpdate.body.substring(0, 200)}...\n\nPlease log in to the portal to view full photographs and records details.`,
      `<h3>New Update Released on ${farm.name}</h3>
       <p>Dear ${investor.name},</p>
       <p>A new estate chronicle has been added directly from the field:</p>
       <table style="padding: 10px; background-color: #F8F4EC; border-radius: 6px; width: 100%;">
         <tr><td><b>Update:</b></td><td>${newUpdate.title}</td></tr>
         <tr><td><b>Category:</b></td><td><span style="background-color:#52B788;color:white;padding:3px 6px;border-radius:4px;font-size:12px;">${newUpdate.updateType.toUpperCase()}</span></td></tr>
         <tr><td><b>Posted By:</b></td><td>${newUpdate.postedByName}</td></tr>
         <tr><td><b>Date:</b></td><td>${new Date(newUpdate.createdAt).toDateString()}</td></tr>
       </table>
       <p style="margin-top:20px; font-style: italic; border-left: 3px solid #1B4332; padding-left: 10px;">
         "${newUpdate.body.substring(0, 250)}..."
       </p>
       <p><a href="${process.env.APP_URL || 'https://ai.studio/build'}" style="background-color:#1B4332;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Access Investor Portal</a></p>`,
      'Farm Update'
    );
  });

  res.status(201).json(newUpdate);
});

// Upload farm Document (Admin/Manager assigned only)
app.post('/api/documents/farm/:id/upload', requireAuth, upload.single('file'), async (req, res) => {
  const user = (req as any).user as User;
  const farmId = req.params.id;
  const { title, category, visibility, description, plotId } = req.body;

  const farm = db.farms.find(f => f.id === farmId);
  if (!farm) {
    return res.status(404).json({ error: 'Farm not found' });
  }

  let authorized = false;
  if (user.role === UserRole.ADMIN) {
    authorized = true;
  } else if (user.role === UserRole.FARM_MANAGER) {
    authorized = db.assignments.some(
      a => a.managerId === user.id && a.farmId === farmId && a.isActive
    );
  }

  if (!authorized) {
    return res.status(403).json({ error: 'Not authorized to upload files for this farm' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Please attach a valid file' });
  }

  let fileUrl = `/uploads/${req.file.filename}`;
  const fileName = req.file.originalname;

  const cld = getCloudinary();
  if (process.env.CLOUDINARY_URL) {
    try {
      const cldRes = await cld.uploader.upload(req.file.path, {
        folder: 'farm_estate_documents',
        resource_type: 'auto'
      });
      fileUrl = cldRes.secure_url;
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.error('Cloudinary document uploaded locally fallback', e);
    }
  }

  const newDoc: Document = {
    id: 'doc-' + Date.now(),
    farmId,
    plotId: visibility === DocumentVisibility.PLOT ? plotId : undefined,
    uploadedBy: user.id,
    uploadedByName: user.name,
    title,
    fileUrl,
    fileName,
    category: (category as DocumentCategory) || DocumentCategory.OTHER,
    visibility: (visibility as DocumentVisibility) || DocumentVisibility.FARM,
    description: description || '',
    uploadedAt: new Date().toISOString()
  };

  db.documents.push(newDoc);
  saveDb();

  // EMAIL TRIGGER 2: New document uploaded → email affected investors
  let targetedInvestors: User[] = [];
  if (newDoc.visibility === DocumentVisibility.PLOT && newDoc.plotId) {
    const ownerships = db.investorPlots.filter(ip => ip.plotId === newDoc.plotId && ip.isActive);
    const investorIds = ownerships.map(ip => ip.investorId);
    targetedInvestors = db.users.filter(u => u.role === UserRole.INVESTOR && investorIds.includes(u.id));
  } else {
    // Farm-wide document: email all investors that hold plots on this farm
    const plotsInFarm = db.plots.filter(p => p.farmId === farmId);
    const plotIds = plotsInFarm.map(p => p.id);
    const farmInvestorsIds = db.investorPlots.filter(ip => ip.isActive && plotIds.includes(ip.plotId)).map(ip => ip.investorId);
    targetedInvestors = db.users.filter(u => u.role === UserRole.INVESTOR && farmInvestorsIds.includes(u.id));
  }

  targetedInvestors.forEach(investor => {
    dispatchEmail(
      investor.email,
      `New Document Available: ${newDoc.title}`,
      `Hello ${investor.name},\n\nA new document is available regarding your farmlands:\nTitle: ${newDoc.title}\nCategory: ${newDoc.category}\n\nPlease access the private client portal to download this file securely.`,
      `<h3>New Secure Document Published</h3>
       <p>Dear ${investor.name},</p>
       <p>A new secure regulatory or status document has been uploaded for your attention:</p>
       <table style="padding: 10px; background-color: #F8F4EC; border-radius: 6px; width: 100%;">
         <tr><td><b>Title:</b></td><td>${newDoc.title}</td></tr>
         <tr><td><b>Category:</b></td><td><span style="background-color:#1B4332;color:white;padding:3px 6px;border-radius:4px;font-size:12px;">${newDoc.category.toUpperCase()}</span></td></tr>
         <tr><td><b>File Name:</b></td><td>${newDoc.fileName}</td></tr>
         <tr><td><b>Estate:</b></td><td>${farm.name}</td></tr>
         ${newDoc.plotId ? `<tr><td><b>Target Plot:</b></td><td>${db.plots.find(p => p.id === newDoc.plotId)?.plotNumber || 'N/A'}</td></tr>` : ''}
       </table>
       <p>To safely access and download your document, please authenticately log in to the portal.</p>
       <p><a href="${process.env.APP_URL || 'https://ai.studio/build'}" style="background-color:#1B4332;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Log In & Download Securely</a></p>`,
      'Document Upload'
    );
  });

  res.status(201).json(newDoc);
});

// Secure Document download check & serving
app.get('/api/documents/:id/download', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const docId = req.params.id;

  const doc = db.documents.find(d => d.id === docId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Access check
  let isAuthorized = false;
  if (user.role === UserRole.ADMIN) {
    isAuthorized = true;
  } else if (user.role === UserRole.FARM_MANAGER) {
    // Farm managers can see general docs, but not financial categories
    const managesFarm = db.assignments.some(
      a => a.managerId === user.id && a.farmId === doc.farmId && a.isActive
    );
    if (managesFarm && doc.category !== DocumentCategory.FINANCIAL) {
      isAuthorized = true;
    }
  } else if (user.role === UserRole.INVESTOR) {
    const investorPlotsList = db.investorPlots.filter(ip => ip.investorId === user.id && ip.isActive);
    const plotIds = investorPlotsList.map(ip => ip.plotId);
    const ownsPlotInFarm = db.plots.some(p => p.farmId === doc.farmId && plotIds.includes(p.id));

    if (ownsPlotInFarm) {
      if (doc.visibility === DocumentVisibility.FARM) {
        isAuthorized = true;
      } else if (doc.visibility === DocumentVisibility.PLOT && doc.plotId && plotIds.includes(doc.plotId)) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Forbidden — You do not have permission to download this secure document' });
  }

  // Handle serving the actual file or a mock file stream if they uploaded standard seeds
  if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), doc.fileUrl);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
      return res.sendFile(filePath);
    }
  }

  // Fallback stream for built-in or simulated documents
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
  res.send(Buffer.from(`%PDF-1.4\n%-- Adubiaro Secure Server Verification --\n1 0 obj\n<< /Title (${doc.title}) >>\nstream\nSecure investor portal document content.\nUploaded At: ${doc.uploadedAt}\nFile reference: ${doc.id}\nendstream\nendobj\nxref\n0 1\n0000000000 65535 f\ntrailer\n<< /Root 1 0 R >>\n%%EOF`));
});

// Investor individual portfolio / financial payout summaries
app.get('/api/financials/my', requireAuth, (req, res) => {
  const user = (req as any).user as User;

  // STRICT RULEBoundary: Farm Manager cannot access financials AT ALL
  if (user.role === UserRole.FARM_MANAGER) {
    return res.status(403).json({ error: 'Farm managers are restricted from accessing financial dashboards.' });
  }

  if (user.role === UserRole.ADMIN) {
    // Admin sees everything
    const allPayouts = db.financials.map(fin => {
      const plot = db.plots.find(p => p.id === fin.plotId);
      const farm = plot ? db.farms.find(f => f.id === plot.farmId) : null;
      const ownerShip = db.investorPlots.find(ip => ip.plotId === fin.plotId && ip.isActive);
      const investorName = ownerShip ? (db.users.find(u => u.id === ownerShip.investorId)?.name || 'Unknown') : 'Unassigned';
      return {
        ...fin,
        plotNumber: plot?.plotNumber,
        cropType: plot?.cropType,
        farmName: farm?.name,
        investorName
      };
    });
    return res.json(allPayouts);
  }

  if (user.role === UserRole.INVESTOR) {
    // Investor sees only their owned plots' summaries
    const ownerships = db.investorPlots.filter(ip => ip.investorId === user.id && ip.isActive);
    const ownedPlotIds = ownerships.map(ip => ip.plotId);
    
    const summaries = db.financials
      .filter(f => ownedPlotIds.includes(f.plotId))
      .map(fin => {
        const plot = db.plots.find(p => p.id === fin.plotId);
        const farm = plot ? db.farms.find(f => f.id === plot.farmId) : null;
        return {
          ...fin,
          plotNumber: plot?.plotNumber,
          cropType: plot?.cropType,
          farmName: farm?.name
        };
      });

    return res.json(summaries);
  }

  res.json([]);
});

// Upload/Post Financial record (Admin only)
app.post('/api/financials/upload', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin credentials required to publish financials' });
  }

  const { plotId, period, year, roiPercentage, payoutAmount, payoutDate, notes, status } = req.body;

  const settings = getSettings();
  const fileRoi = parseFloat(roiPercentage || '0');
  if (fileRoi < settings.minimumPayoutRoi) {
    return res.status(400).json({ error: `Transaction rejected: Financial ROI of ${fileRoi}% is below the active System Minimum ROI limit (${settings.minimumPayoutRoi}%) established in Settings.` });
  }

  // Check unique together constraint [plotId + period + year]
  const alreadyExists = db.financials.some(
    fin => fin.plotId === plotId && fin.period === period && fin.year === parseInt(year)
  );

  if (alreadyExists) {
    return res.status(400).json({ error: `A financial record for Plot, Period ${period}, and Year ${year} already exists.` });
  }

  const newFin: FinancialSummary = {
    id: 'fin-' + Date.now(),
    plotId,
    uploadedBy: user.id,
    period,
    year: parseInt(year),
    roiPercentage: parseFloat(roiPercentage || '0'),
    payoutAmount: parseFloat(payoutAmount || '0'),
    payoutDate: payoutDate || new Date().toISOString().split('T')[0],
    status: (status as FinancialStatus) || FinancialStatus.PENDING,
    notes: notes || ''
  };

  db.financials.push(newFin);
  saveDb();

  // EMAIL TRIGGER 3: Financial record added → email the specific plot investor
  const plot = db.plots.find(p => p.id === plotId);
  const investorPlotSetting = db.investorPlots.find(ip => ip.plotId === plotId && ip.isActive);
  if (investorPlotSetting) {
    const investor = db.users.find(u => u.id === investorPlotSetting.investorId && u.role === UserRole.INVESTOR);
    if (investor) {
      dispatchEmail(
        investor.email,
        `Financial Summary Available: ${newFin.period} ${newFin.year} — Plot ${plot?.plotNumber}`,
        `Hello ${investor.name},\n\nA financial summary is now available with the following:\nAmount: ₦${newFin.payoutAmount}\nStatus: ${newFin.status}\nDue Date: ${newFin.payoutDate}\n\nPlease visit the portal to inspect detail metrics or log transaction records.`,
        `<h3>New Financial Payout Summary Ready</h3>
         <p>Dear ${investor.name},</p>
         <p>A payout ledger has been audited and compiled for your property:</p>
         <table style="padding: 10px; background-color: #F8F4EC; border-radius: 6px; width: 100%;">
           <tr><td><b>Plot:</b></td><td>${plot?.plotNumber || 'N/A'}</td></tr>
           <tr><td><b>Billing Period:</b></td><td>${newFin.period} ${newFin.year}</td></tr>
           <tr><td><b>Audited ROI:</b></td><td>${newFin.roiPercentage}%</td></tr>
           <tr><td><b>Net Payout:</b></td><td><b>₦${newFin.payoutAmount.toLocaleString()}</b></td></tr>
           <tr><td><b>Payment Status:</b></td><td><span style="background-color:${newFin.status === 'paid' ? '#52B788' : '#D4A017'};color:white;padding:3px 6px;border-radius:4px;font-size:12px;">${newFin.status.toUpperCase()}</span></td></tr>
           <tr><td><b>payout Scheduled Date:</b></td><td>${newFin.payoutDate}</td></tr>
         </table>
         <p>Log in using your secure dashboard credentials to request disbursement or review balance certificates.</p>
         <p><a href="${process.env.APP_URL || 'https://ai.studio/build'}" style="background-color:#1B4332;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Access Financial Dashboard</a></p>`,
        'Financial Addition'
      );
    }
  }

  res.status(201).json(newFin);
});

// Admin command: Manage user creation (Admin only)
app.post('/api/users/create', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Restricted to super administrators.' });
  }

  const { username, name, email, phone, role } = req.body;

  // Unique username validation
  const existingUser = db.users.find(u => u.username === username);
  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const newUserId = 'user-' + Date.now();
  const createdUser: User = {
    id: newUserId,
    username,
    name,
    email,
    phone,
    role: (role as UserRole) || UserRole.INVESTOR
  };

  db.users.push(createdUser);
  saveDb();

  // Set default temporary password for welcome notification
  let tempPassword = 'User@1234';
  if (role === UserRole.FARM_MANAGER) tempPassword = 'Manager@1234';
  if (role === UserRole.INVESTOR) tempPassword = 'Investor@1234';
  if (role === UserRole.ADMIN) tempPassword = 'Admin@1234';

  // EMAIL TRIGGER 4: New user / investor account created → welcome email
  dispatchEmail(
    createdUser.email,
    'Welcome to Adubiaro Farm Estates Portal',
    `Hello ${createdUser.name},\n\nYour profile has been provisioned on Adubiaro Estates.\nUsername: ${createdUser.username}\nTemporary Password: ${tempPassword}\n\nPlease click the link to configure your dashboard securely.`,
    `<h3>Welcome to Adubiaro Estates Private Portal</h3>
     <p>Dear ${createdUser.name},</p>
     <p>An administrative account has been securely setup for you on our private client portal.</p>
     <p>Your roles permissions: <b>${createdUser.role.toUpperCase()}</b></p>
     <table style="padding: 10px; background-color: #F8F4EC; border-radius: 6px; width: 100%;">
       <tr><td><b>Authorized Username:</b></td><td>${createdUser.username}</td></tr>
       <tr><td><b>Temporary Password:</b></td><td><code>${tempPassword}</code></td></tr>
       <tr><td><b>Sign-Up Email:</b></td><td>${createdUser.email}</td></tr>
     </table>
     <p>You are required to log in and change your temporary password immediately upon landing.</p>
     <p><a href="${process.env.APP_URL || 'https://ai.studio/build'}" style="background-color:#1B4332;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Access Login Dashboard</a></p>`,
    'Welcome Registration'
  );

  res.status(201).json(createdUser);
});

// Admin Route to list system users list
app.get('/api/admin/users', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json(db.users);
});

// Admin route to manage plots, link to farms, assign plots to investors
app.post('/api/admin/plots/create', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { farmId, plotNumber, sizeHectares, cropType, InvestorId, investmentAmount } = req.body;

  const farm = db.farms.find(f => f.id === farmId);
  if (!farm) {
    return res.status(404).json({ error: 'Farm not found' });
  }

  const plotId = 'plot-' + Date.now();
  const newPlot: FarmPlot = {
    id: plotId,
    farmId,
    plotNumber,
    sizeHectares: parseFloat(sizeHectares || '1.0'),
    cropType: cropType || 'Oil Palm',
    status: PlotStatus.ACTIVE
  };

  db.plots.push(newPlot);

  if (InvestorId) {
    const invPlot: InvestorPlot = {
      id: 'invplot-' + Date.now(),
      investorId: InvestorId,
      plotId,
      investmentAmount: parseFloat(investmentAmount || '20000'),
      ownershipPercentage: 100,
      startDate: new Date().toISOString().split('T')[0],
      contractRef: 'CON-' + Date.now().toString().substring(7),
      isActive: true
    };
    db.investorPlots.push(invPlot);
  }

  // Update total plots dynamically
  farm.totalPlots = db.plots.filter(p => p.farmId === farmId).length;
  farm.totalHectares = db.plots.filter(p => p.farmId === farmId).reduce((s, p) => s + p.sizeHectares, 0);

  saveDb();
  res.status(201).json({ plot: newPlot });
});

// Admin route to create a farm estate
app.post('/api/admin/farms/create', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { name, location, state, coverImage, description, dateEstablished, isActive } = req.body;

  if (!name || !location || !state) {
    return res.status(400).json({ error: 'Name, location and state are required.' });
  }

  const farmId = 'farm-' + Date.now();
  const newFarm: Farm = {
    id: farmId,
    name,
    location,
    state,
    totalPlots: 0,
    totalHectares: 0,
    description: description || '',
    coverImage: coverImage || 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=800',
    dateEstablished: dateEstablished || new Date().toISOString().split('T')[0],
    isActive: isActive !== undefined ? Boolean(isActive) : true
  };

  db.farms.push(newFarm);
  saveDb();
  res.status(201).json(newFarm);
});

// Admin route to update an existing farm estate
app.post('/api/admin/farms/:id/update', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const farmId = req.params.id;
  const farm = db.farms.find(f => f.id === farmId);
  if (!farm) {
    return res.status(404).json({ error: 'Farm estate not found' });
  }

  const { name, location, state, coverImage, description, dateEstablished, isActive } = req.body;

  if (name !== undefined) farm.name = name;
  if (location !== undefined) farm.location = location;
  if (state !== undefined) farm.state = state;
  if (coverImage !== undefined) farm.coverImage = coverImage;
  if (description !== undefined) farm.description = description;
  if (dateEstablished !== undefined) farm.dateEstablished = dateEstablished;
  if (isActive !== undefined) farm.isActive = Boolean(isActive);

  // Re-calculate total plots and total hectares
  farm.totalPlots = db.plots.filter(p => p.farmId === farmId).length;
  farm.totalHectares = db.plots.filter(p => p.farmId === farmId).reduce((s, p) => s + p.sizeHectares, 0);

  saveDb();
  res.json(farm);
});

// Admin route to assign farm manager mapping
app.post('/api/admin/assignments/create', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { managerId, farmId } = req.body;
  
  const alreadyAssigned = db.assignments.find(a => a.managerId === managerId && a.farmId === farmId && a.isActive);
  if (alreadyAssigned) {
    return res.status(400).json({ error: 'Manager is already assigned to this farm.' });
  }

  const newAssign: FarmManagerAssignment = {
    id: 'assign-' + Date.now(),
    managerId,
    farmId,
    assignedDate: new Date().toISOString().split('T')[0],
    isActive: true
  };

  db.assignments.push(newAssign);
  saveDb();
  res.json(newAssign);
});

// Route to get list of emails sent (simulated outbox logs)
app.get('/api/emails/outbox', requireAuth, (req, res) => {
  // Let only admin and related users inspect for security, or let anyone see simulated emails in demo mode
  res.json(db.simulatedEmails);
});

// Route to get user-specific alerts/notifications
app.get('/api/notifications', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const settings = getSettings();
  if (!settings.enableNotifications) {
    return res.json([]);
  }

  const notifications: any[] = [];

  // 1. Gather investor plots/farms if needed
  const myInvestorPlots = db.investorPlots.filter(ip => ip.investorId === user.id && ip.isActive);
  const myPlotIds = myInvestorPlots.map(ip => ip.plotId);
  const myInvestorFarmsList = db.plots.filter(p => myPlotIds.includes(p.id));
  const myInvestorFarmIds = [...new Set(myInvestorFarmsList.map(p => p.farmId))];

  // 2. Gather manager farms if needed
  const myAssignments = db.assignments.filter(a => a.managerId === user.id && a.isActive);
  const myManagedFarmIds = myAssignments.map(a => a.farmId);

  // Gather ROI Payouts
  if (user.role === UserRole.ADMIN) {
    db.financials.forEach(fin => {
      const plot = db.plots.find(p => p.id === fin.plotId);
      const farm = plot ? db.farms.find(f => f.id === plot.farmId) : null;
      notifications.push({
        id: `roi-${fin.id}`,
        type: 'roi_payout',
        title: 'ROI Payout Published',
        message: `A payout of ₦${fin.payoutAmount.toLocaleString()} (${fin.roiPercentage}% ROI) for Plot #${plot?.plotNumber || 'N/A'} has been published.`,
        date: fin.payoutDate || new Date().toISOString(),
        relatedId: fin.id,
        meta: {
          farmId: farm?.id || '',
          farmName: farm?.name || 'N/A',
          plotNumber: plot?.plotNumber || 'N/A',
          roiPercentage: fin.roiPercentage,
          payoutAmount: fin.payoutAmount,
          period: fin.period,
          year: fin.year,
          status: fin.status
        }
      });
    });
  } else if (user.role === UserRole.INVESTOR) {
    // Only where the investor owns the plot
    const investorFinancials = db.financials.filter(fin => myPlotIds.includes(fin.plotId));
    investorFinancials.forEach(fin => {
      const plot = db.plots.find(p => p.id === fin.plotId);
      const farm = plot ? db.farms.find(f => f.id === plot.farmId) : null;
      notifications.push({
        id: `roi-${fin.id}`,
        type: 'roi_payout',
        title: 'ROI Payout Received',
        message: `Your plot #${plot?.plotNumber || 'N/A'} of crop "${plot?.cropType || 'N/A'}" received a payout of ₦${fin.payoutAmount.toLocaleString()} (${fin.roiPercentage}% ROI) for ${fin.period} ${fin.year}.`,
        date: fin.payoutDate || new Date().toISOString(),
        relatedId: fin.id,
        meta: {
          farmId: farm?.id || '',
          farmName: farm?.name || 'N/A',
          plotNumber: plot?.plotNumber || 'N/A',
          roiPercentage: fin.roiPercentage,
          payoutAmount: fin.payoutAmount,
          period: fin.period,
          year: fin.year,
          status: fin.status
        }
      });
    });
  } // FARM_MANAGER gets 0 ROI payout notifications.

  // Gather Farm Updates
  db.updates.filter(u => u.isPublished).forEach(u => {
    let visible = false;
    if (user.role === UserRole.ADMIN) {
      visible = true;
    } else if (user.role === UserRole.FARM_MANAGER) {
      visible = myManagedFarmIds.includes(u.farmId);
    } else if (user.role === UserRole.INVESTOR) {
      const isMyFarm = myInvestorFarmIds.includes(u.farmId);
      const isTargeted = !u.targetInvestorIds || u.targetInvestorIds.length === 0 || u.targetInvestorIds.includes(user.id);
      visible = isMyFarm && isTargeted;
    }

    if (visible) {
      const farm = db.farms.find(f => f.id === u.farmId);
      notifications.push({
        id: `update-${u.id}`,
        type: 'farm_update',
        title: u.title,
        message: `New farm update under category "${u.updateType}" has been posted in ${farm?.name || 'Farm'}.`,
        date: u.createdAt || new Date().toISOString(),
        relatedId: u.id,
        meta: {
          farmId: u.farmId,
          farmName: farm?.name || 'N/A',
          body: u.body,
          updateType: u.updateType,
          postedByName: u.postedByName
        }
      });
    }
  });

  // Gather Documents
  db.documents.forEach(d => {
    let visible = false;
    if (user.role === UserRole.ADMIN) {
      visible = true;
    } else if (user.role === UserRole.FARM_MANAGER) {
      // Must not be sensitive financial doc, and must build on their assigned farm
      visible = myManagedFarmIds.includes(d.farmId) && d.category !== DocumentCategory.FINANCIAL;
    } else if (user.role === UserRole.INVESTOR) {
      const isMyFarm = myInvestorFarmIds.includes(d.farmId);
      // Farm visibility level OR plot visibility matching their owned plot id
      const isDocVisible = d.visibility === DocumentVisibility.FARM || (d.plotId && myPlotIds.includes(d.plotId));
      visible = isMyFarm && isDocVisible;
    }

    if (visible) {
      const farm = db.farms.find(f => f.id === d.farmId);
      notifications.push({
        id: `doc-${d.id}`,
        type: 'document_upload',
        title: `Document Uploaded: ${d.title}`,
        message: `A new ${d.category} document ("${d.fileName}") was added to ${farm?.name || 'Farm'}.`,
        date: d.uploadedAt || new Date().toISOString(),
        relatedId: d.id,
        meta: {
          farmId: d.farmId,
          farmName: farm?.name || 'N/A',
          category: d.category,
          fileName: d.fileName,
          description: d.description,
          fileUrl: d.fileUrl
        }
      });
    }
  });

  // Sort by date descending
  notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json(notifications);
});

// Reset command (simulates seed_demo)
app.post('/api/admin/reset-db', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin authentication required.' });
  }
  if (usePostgres) {
    await resetPostgresDb();
  }
  db = getInitialDb();
  saveDb();
  res.json({ message: 'Database successfully restored to original seed demo values.' });
});

// Clean Slate command (Wipe demo data, transition to live/production)
app.post('/api/admin/clean-slate', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin authentication required.' });
  }

  try {
    if (usePostgres) {
      await clearAllButAdminPostgres();
    }

    // Filter memory db state
    db.users = db.users.filter(u => u.role === UserRole.ADMIN);
    db.farms = [];
    db.plots = [];
    db.investorPlots = [];
    db.assignments = [];
    db.updates = [];
    db.documents = [];
    db.financials = [];
    db.simulatedEmails = [];

    saveDb();
    res.json({ message: 'Database successfully migrated to clean slate. Ready for live production data!' });
  } catch (err: any) {
    console.error('❌ Failed to transition database to clean slate:', err);
    res.status(500).json({ error: 'Could not perform clean slate operations.' });
  }
});

// SYSTEM BACKUPS AND MAINTENANCE MANAGER
interface BackupLog {
  id: string;
  timestamp: string;
  backupType: 'scheduled' | 'manual';
  fileName: string;
  fileSize: string;
  status: 'success' | 'failed';
}

const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const BACKUP_LOGS_FILE = path.join(DATA_DIR, 'backup_logs.json');

function getInitialBackupLogs(): BackupLog[] {
  const logs: BackupLog[] = [];
  const baseTime = new Date('2026-06-18T00:00:00-07:00');
  for (let i = 0; i < 5; i++) {
    const historicalTime = new Date(baseTime.getTime() - i * 24 * 60 * 60 * 1000);
    historicalTime.setHours(2, 15, 0, 0);
    
    logs.push({
      id: `bk-${historicalTime.getTime()}`,
      timestamp: historicalTime.toISOString(),
      backupType: 'scheduled',
      fileName: `db-backup-${historicalTime.getTime()}.json`,
      fileSize: '12.4 KB',
      status: 'success'
    });
  }
  return logs;
}

function loadBackupLogs(): BackupLog[] {
  if (!fs.existsSync(BACKUPS_DIR)) {
    try {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    } catch (e) {
      console.error('Failed to create backups directory:', e);
    }
  }
  if (fs.existsSync(BACKUP_LOGS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(BACKUP_LOGS_FILE, 'utf8'));
    } catch {
      const initial = getInitialBackupLogs();
      try {
        fs.writeFileSync(BACKUP_LOGS_FILE, JSON.stringify(initial, null, 2));
      } catch (e) {
        console.error('Failed to write default backup logs:', e);
      }
      return initial;
    }
  } else {
    const initial = getInitialBackupLogs();
    try {
      fs.writeFileSync(BACKUP_LOGS_FILE, JSON.stringify(initial, null, 2));
    } catch (e) {
      console.error('Failed to write default backup logs:', e);
    }
    return initial;
  }
}

function saveBackupLogs(logs: BackupLog[]) {
  try {
    fs.writeFileSync(BACKUP_LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (e) {
    console.error('Failed to write backup logs:', e);
  }
}

app.get('/api/admin/backups', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  const logs = loadBackupLogs();
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(logs);
});

app.post('/api/admin/backups/create', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  try {
    const logs = loadBackupLogs();
    const timestamp = new Date().toISOString();
    const id = `bk-${Date.now()}`;
    const fileName = `db-backup-${Date.now()}.json`;
    const filePath = path.join(BACKUPS_DIR, fileName);

    // Save actual snapshot copy of db as raw json
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2));

    let fileSizeInKB = '12.0 KB';
    try {
      const stats = fs.statSync(filePath);
      fileSizeInKB = (stats.size / 1024).toFixed(2) + ' KB';
    } catch (e) {
      console.error('Failed to read backup file stats:', e);
    }

    const newLog: BackupLog = {
      id,
      timestamp,
      backupType: 'manual',
      fileName,
      fileSize: fileSizeInKB,
      status: 'success'
    };

    logs.unshift(newLog);
    saveBackupLogs(logs);

    res.json({
      message: 'Active database snapshot archived successfully.',
      backup: newLog,
      logs
    });
  } catch (err: any) {
    console.error('❌ Manual backup creation error:', err);
    res.status(500).json({ error: 'System backup engine failed.' });
  }
});

app.get('/api/admin/db-status', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  let dbHost = 'N/A';
  let dbPort = '5432';
  let dbName = 'N/A';
  if (isPostgresConfigured() && process.env.DATABASE_URL) {
    try {
      const parseUrl = new URL(process.env.DATABASE_URL);
      dbHost = parseUrl.hostname;
      dbPort = parseUrl.port || '5432';
      dbName = parseUrl.pathname.replace(/^\//, '');
    } catch {
      const match = process.env.DATABASE_URL.match(/@([^:\/]+)(?::(\d+))?\/([^?]+)/);
      if (match) {
        dbHost = match[1];
        dbPort = match[2] || '5432';
        dbName = match[3];
      }
    }
  }

  res.json({
    usePostgres,
    postgresError,
    dbHost,
    dbPort,
    dbName,
    configured: isPostgresConfigured()
  });
});

app.get('/api/admin/settings', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  res.json(getSettings());
});

app.put('/api/admin/settings', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const currentSettings = getSettings();
  const newSettings = req.body;

  if (newSettings.databaseMode !== undefined) currentSettings.databaseMode = newSettings.databaseMode;
  if (newSettings.simulatedLatency !== undefined) currentSettings.simulatedLatency = parseInt(newSettings.simulatedLatency !== null ? newSettings.simulatedLatency : '0');
  if (newSettings.enableNotifications !== undefined) currentSettings.enableNotifications = Boolean(newSettings.enableNotifications);
  if (newSettings.enableEmailSimulation !== undefined) currentSettings.enableEmailSimulation = Boolean(newSettings.enableEmailSimulation);
  if (newSettings.minimumPayoutRoi !== undefined) currentSettings.minimumPayoutRoi = parseFloat(newSettings.minimumPayoutRoi !== null ? newSettings.minimumPayoutRoi : '0');
  if (newSettings.allowedCrops !== undefined) currentSettings.allowedCrops = Array.isArray(newSettings.allowedCrops) ? newSettings.allowedCrops : currentSettings.allowedCrops;
  if (newSettings.portalName !== undefined) currentSettings.portalName = newSettings.portalName;
  if (newSettings.logoText !== undefined) currentSettings.logoText = newSettings.logoText;
  if (newSettings.accentColor !== undefined) currentSettings.accentColor = newSettings.accentColor;
  if (newSettings.announcementBanner !== undefined) currentSettings.announcementBanner = newSettings.announcementBanner;
  if (newSettings.bannerType !== undefined) currentSettings.bannerType = newSettings.bannerType;

  // React to database mode shift on the fly
  if (currentSettings.databaseMode === 'local_json') {
    usePostgres = false;
  } else if (currentSettings.databaseMode === 'postgres_forced' || currentSettings.databaseMode === 'auto') {
    if (!usePostgres && isPostgresConfigured()) {
      initPostgres().catch(err => console.error('Failed to rebuild Postgres connection during settings shift:', err));
    }
  }

  saveDb();
  res.json(currentSettings);
});

app.get('/api/portal/settings', (req, res) => {
  const settings = getSettings();
  res.json({
    portalName: settings.portalName,
    logoText: settings.logoText,
    accentColor: settings.accentColor,
    announcementBanner: settings.announcementBanner,
    bannerType: settings.bannerType,
    allowedCrops: settings.allowedCrops
  });
});

// INTEGRATE VITE NODE DEV SERVER MIDDLEWARE
async function startServer() {
  await initFirestore();
  await initPostgres();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production Assets serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Portal backend running at http://localhost:${PORT}`);
  });
}

startServer();
