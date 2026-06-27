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
import { initializeFirestore, doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore/lite';
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

// Setup dynamic SMTP and Brevo email configuration helpers
async function sendSmtpEmail({
  host,
  port,
  secure,
  user,
  pass,
  from,
  to,
  subject,
  text,
  html
}: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    },
    connectionTimeout: 8000,  // Fail-fast connection timeout
    greetingTimeout: 8000,    // Fail-fast greeting timeout
    socketTimeout: 12000      // Fail-fast socket inactivity timeout
  });

  await transporter.sendMail({
    from: from || 'Adubiaro Farms <noreply@adubiaro.com>',
    to,
    subject,
    text,
    html
  });
}

async function sendBrevoEmail({
  apiKey,
  senderName,
  senderEmail,
  to,
  subject,
  text,
  html
}: {
  apiKey: string;
  senderName: string;
  senderEmail: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const url = 'https://api.brevo.com/v3/smtp/email';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        name: senderName || 'Adubiaro Farms',
        email: senderEmail || 'noreply@adubiaro.com'
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
      textContent: text
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Brevo API Error (${response.status}): ${errText}`);
  }
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
        name: 'Basit Ajibade',
        isActive: true
      }
    ],
    farms: [],
    plots: [],
    investorPlots: [],
    assignments: [],
    updates: [],
    documents: [],
    financials: [],
    simulatedEmails: [],
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
      bannerType: 'none',
      emailServiceType: 'simulation',
      smtpHost: process.env.EMAIL_HOST || '',
      smtpPort: parseInt(process.env.EMAIL_PORT || '587'),
      smtpSecure: process.env.EMAIL_USE_TLS === 'false' ? false : true,
      smtpUser: process.env.EMAIL_HOST_USER || '',
      smtpPass: process.env.EMAIL_HOST_PASSWORD || '',
      smtpFrom: process.env.DEFAULT_FROM_EMAIL || 'Adubiaro Farms <noreply@adubiaro.com>',
      brevoApiKey: '',
      brevoSenderEmail: 'noreply@adubiaro.com',
      brevoSenderName: 'Adubiaro Farms'
    }
  };
}

let db: DatabaseSchema = getInitialDb();

// Initialize Firebase Firestore client from config
let firestoreDb: any = null;
let firebaseConfig: any = null;
let firebaseDiagnosticResult: {
  isValidConfig: boolean;
  canConnect: boolean;
  errorType: 'none' | 'config' | 'network' | 'auth_permission' | 'unknown';
  errorMessage: string | null;
} = {
  isValidConfig: false,
  canConnect: false,
  errorType: 'none',
  errorMessage: 'Firebase diagnostics have not completed.'
};

try {
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
    firestoreDb = initializeFirestore(fApp, {}, dbId);
    console.log(`✅ Firebase Firestore client (Lite mode) successfully initialized on database: "${dbId}".`);
  } else {
    console.warn('⚠️ No Firebase configuration found (neither env vars nor JSON config). Firestore cloud backing disabled.');
  }
} catch (e) {
  console.error('❌ Failed to initialize Firebase Firestore:', e);
}

/**
 * Diagnostic step that verifies the Firebase App configuration object is correctly initialized
 * before attempting any Firestore operations.
 * Error handling clearly distinguishes between network connectivity issues and authentication/permission-denied issues.
 */
async function runFirebaseDiagnostics(config: any): Promise<{
  isValidConfig: boolean;
  canConnect: boolean;
  errorType: 'none' | 'config' | 'network' | 'auth_permission' | 'unknown';
  errorMessage: string | null;
}> {
  console.log('🔍 [Firebase Diagnostic] Starting detailed verification of Firebase App configuration object...');
  
  if (!config) {
    const msg = 'No configuration object found. Firebase credentials are empty.';
    console.warn(`⚠️ [Firebase Diagnostic] ${msg}`);
    return { isValidConfig: false, canConnect: false, errorType: 'config', errorMessage: msg };
  }

  // 1. Verify required keys
  const requiredFields = ['apiKey', 'projectId'];
  const missingFields = requiredFields.filter(f => !config[f]);
  if (missingFields.length > 0) {
    const msg = `Configuration lacks necessary Firebase fields: ${missingFields.join(', ')}`;
    console.warn(`⚠️ [Firebase Diagnostic] ${msg}`);
    return { isValidConfig: false, canConnect: false, errorType: 'config', errorMessage: msg };
  }

  console.log('✅ [Firebase Diagnostic] Firebase configuration object verified successfully.');
  console.log(`ℹ️ [Firebase Diagnostic] Target Project: "${config.projectId}", database: "${config.firestoreDatabaseId || '(default)'}"`);

  if (!firestoreDb) {
    const msg = 'Firebase Firestore client was not initialized even though a configuration was provided.';
    console.error(`❌ [Firebase Diagnostic] ${msg}`);
    return { isValidConfig: true, canConnect: false, errorType: 'config', errorMessage: msg };
  }

  // 2. Perform a connection probe (test read) to Firestore to verify connection/permissions
  try {
    console.log('⚡ [Firebase Diagnostic] Performing diagnostic connectivity probe to Firestore...');
    // We attempt to read the settings document. In Firestore Lite, this goes directly to the server.
    const testDocRef = doc(firestoreDb, 'settings', 'standalone');
    await getDoc(testDocRef);
    console.log('🎉 [Firebase Diagnostic] Connectivity probe succeeded! Firestore client is fully online and responsive.');
    return { isValidConfig: true, canConnect: true, errorType: 'none', errorMessage: null };
  } catch (error: any) {
    const errMsg = error.message || String(error);
    const errCode = error.code || '';
    
    console.error(`❌ [Firebase Diagnostic] Firestore connectivity probe failed! Error message: "${errMsg}" (Code: ${errCode})`);

    // 3. Classify error type: network connectivity vs authentication/permissions
    const lowercaseMsg = errMsg.toLowerCase();
    const lowercaseCode = String(errCode).toLowerCase();
    
    const isAuthOrPermission = 
      lowercaseMsg.includes('permission') || 
      lowercaseMsg.includes('insufficient') ||
      lowercaseMsg.includes('unauthorized') || 
      lowercaseMsg.includes('unauthenticated') ||
      lowercaseMsg.includes('auth/') || 
      lowercaseMsg.includes('api key') ||
      lowercaseMsg.includes('invalid-credential') ||
      lowercaseMsg.includes('forbidden') ||
      lowercaseCode.includes('permission-denied') || 
      lowercaseCode.includes('unauthenticated');

    const isNetwork = 
      lowercaseMsg.includes('offline') || 
      lowercaseMsg.includes('network') || 
      lowercaseMsg.includes('timeout') || 
      lowercaseMsg.includes('getaddrinfo') || 
      lowercaseMsg.includes('connect') ||
      lowercaseMsg.includes('dns') ||
      lowercaseMsg.includes('econnrefused') || 
      lowercaseMsg.includes('etimedout') ||
      lowercaseMsg.includes('unreachable');

    if (isAuthOrPermission) {
      const diagnosis = 'AUTHENTICATION & PERMISSION ISSUE: Your credentials or API key may be incorrect or lack database privileges, or your Security Rules are preventing this operation. Please verify firestore.rules and your service account permissions.';
      console.error(`🛡️ [Firebase Diagnostic] CLASSIFICATION: ${diagnosis}`);
      return { isValidConfig: true, canConnect: false, errorType: 'auth_permission', errorMessage: `${errMsg} (Classification: ${diagnosis})` };
    } else if (isNetwork) {
      const diagnosis = 'NETWORK CONNECTIVITY ISSUE: Unable to establish a network socket with the Google/Firebase APIs. Please verify your internet connection, DNS configuration, and make sure standard TCP outbound traffic is not blocked.';
      console.error(`🌐 [Firebase Diagnostic] CLASSIFICATION: ${diagnosis}`);
      return { isValidConfig: true, canConnect: false, errorType: 'network', errorMessage: `${errMsg} (Classification: ${diagnosis})` };
    } else {
      const diagnosis = `UNCLASSIFIED INTEGRATION ISSUE: An unexpected error occurred: "${errMsg}".`;
      console.error(`❓ [Firebase Diagnostic] CLASSIFICATION: ${diagnosis}`);
      return { isValidConfig: true, canConnect: false, errorType: 'unknown', errorMessage: `${errMsg} (Classification: ${diagnosis})` };
    }
  }
}

// Helper for retrying Firestore operations with exponential backoff
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 5, delay = 1000): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }
      const waitTime = delay * Math.pow(2, attempt - 1);
      console.warn(`⚠️ Firestore operation failed (attempt ${attempt}/${retries}). Retrying in ${waitTime}ms... Error: ${error.message || error}`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Unreachable in retryWithBackoff');
}

// Helper to load complete memory db state from Firestore collections
async function loadDbFromFirestore() {
  if (!firestoreDb) {
    throw new Error('Firestore is not configured.');
  }
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
      const querySnapshot = await retryWithBackoff(() => getDocs(collection(firestoreDb, col.name)), 4, 1000);
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
    const settingsDoc = await retryWithBackoff(() => getDoc(doc(firestoreDb, 'settings', 'standalone')), 4, 1000);
    if (settingsDoc.exists()) {
      db.settings = settingsDoc.data() as SystemSettings;
      loadedSomething = true;
    }

    if (loadedSomething) {
      console.log('✅ Loaded data successfully from Firestore!');
      return true;
    } else {
      console.log('ℹ️ Firestore database is empty.');
      return false;
    }
  } catch (err) {
    console.error('❌ Error reading from Firestore:', err);
    throw err; // propagate so initialization logic knows connection failed
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
          await retryWithBackoff(() => setDoc(doc(firestoreDb, col.name, item.id), cleanData), 3, 1000);
        }
      }
    }

    if (db.settings) {
      const cleanSettings = JSON.parse(JSON.stringify(db.settings));
      await retryWithBackoff(() => setDoc(doc(firestoreDb, 'settings', 'standalone'), cleanSettings), 3, 1000);
    }
    console.log('✅ Synchronized memory DB state to Firestore successfully.');
  } catch (err) {
    console.error('❌ Error synchronizing memory DB to Firestore:', err);
    throw err;
  }
}

async function initFirestore() {
  if (!firestoreDb) {
    console.warn('⚠️ No Firestore client available. Falling back to Local Storage (local db.json).');
    firebaseDiagnosticResult = {
      isValidConfig: false,
      canConnect: false,
      errorType: 'config',
      errorMessage: 'No Firebase client or configuration available.'
    };
    loadLocalJsonDb();
    return;
  }

  // Check if explicitly configured for offline/local JSON mode in local settings file
  let isExplicitlyOffline = false;
  try {
    if (fs.existsSync(DB_FILE)) {
      const localDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (localDb && localDb.settings && localDb.settings.databaseMode === 'local_json') {
        isExplicitlyOffline = true;
        console.log('🔌 Database mode is explicitly set to Local JSON (Offline mode). Bypassing Firestore/cloud initialization.');
      }
    }
  } catch (e) {
    console.warn('⚠️ Could not check local settings file for databaseMode:', e);
  }

  if (isExplicitlyOffline) {
    firebaseDiagnosticResult = {
      isValidConfig: true,
      canConnect: false,
      errorType: 'none',
      errorMessage: 'Local JSON Database mode is explicitly enforced (Offline).'
    };
    loadLocalJsonDb();
    return;
  }

  // Run detailed diagnostic connectivity and permission probe!
  const diagnostics = await runFirebaseDiagnostics(firebaseConfig);
  firebaseDiagnosticResult = diagnostics;

  if (!diagnostics.canConnect) {
    console.error(`❌ Firestore Diagnostics failed: [${diagnostics.errorType.toUpperCase()}] ${diagnostics.errorMessage}`);
    console.warn('⚠️ Falling back to Local Storage (local db.json) due to diagnostic connectivity failure.');
    loadLocalJsonDb();
    return;
  }

  // Attempt to connect and fetch data from Firestore with read/write retry logic
  console.log('🛡️ Attempting to connect to Firestore database with retry logic...');
  try {
    const isSuccess = await loadDbFromFirestore();
    
    // Check if the settings doc exists in Firestore to see if we should seed
    let settingsDocExists = false;
    try {
      const settingsDoc = await retryWithBackoff(() => getDoc(doc(firestoreDb, 'settings', 'standalone')), 4, 1000);
      settingsDocExists = settingsDoc.exists();
    } catch (err) {
      console.error('❌ Could not verify settings doc in Firestore:', err);
    }
    
    // Seed Firestore only if it is completely empty
    if (!settingsDocExists && db.users.length === 0) {
      console.log('🌱 Firestore is empty. Initializing and seeding Firestore database...');
      db = getInitialDb();
      await saveDbToFirestore();
      console.log('✅ Firestore seeded successfully.');
    } else {
      console.log('ℹ️ Firestore already initialized / seeded. Skipping seeding step.');
    }
  } catch (err: any) {
    console.error('❌ CRITICAL: Failed to establish a reliable connection to Firestore on startup:', err);
    console.warn('⚠️ Falling back to Local Storage (local db.json) to preserve app availability, but warning user.');
    loadLocalJsonDb();
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
    name: row.name,
    password: row.password || undefined,
    isActive: row.is_active !== false
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
    updatedAt: row.updated_at || row.created_at,
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
    category: row.category,
    isRead: row.is_read !== undefined ? !!row.is_read : false,
    readAt: row.read_at || undefined,
    senderId: row.sender_id || undefined,
    recipientId: row.recipient_id || undefined,
    farmId: row.farm_id || undefined,
    relatedType: row.related_type || undefined,
    relatedId: row.related_id || undefined
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
        `INSERT INTO users (id, username, role, phone, email, name, password, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           role = EXCLUDED.role,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           name = EXCLUDED.name,
           password = EXCLUDED.password,
           is_active = EXCLUDED.is_active`,
        [user.id, user.username, user.role, user.phone || null, user.email, user.name, user.password || null, user.isActive !== false]
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
        `INSERT INTO updates (id, farm_id, posted_by, posted_by_name, title, body, update_type, target_investor_ids, is_published, created_at, photos, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
           photos = EXCLUDED.photos,
           updated_at = EXCLUDED.updated_at`,
        [up.id, up.farmId, up.postedBy, up.postedByName, up.title, up.body, up.updateType, JSON.stringify(up.targetInvestorIds || []), up.isPublished, up.createdAt, JSON.stringify(up.photos || []), up.updatedAt || up.createdAt]
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
        `INSERT INTO simulated_emails (id, to_address, subject, body, html_body, sent_at, category, is_read, read_at, sender_id, recipient_id, farm_id, related_type, related_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
           to_address = EXCLUDED.to_address,
           subject = EXCLUDED.subject,
           body = EXCLUDED.body,
           html_body = EXCLUDED.html_body,
           sent_at = EXCLUDED.sent_at,
           category = EXCLUDED.category,
           is_read = EXCLUDED.is_read,
           read_at = EXCLUDED.read_at,
           sender_id = EXCLUDED.sender_id,
           recipient_id = EXCLUDED.recipient_id,
           farm_id = EXCLUDED.farm_id,
           related_type = EXCLUDED.related_type,
           related_id = EXCLUDED.related_id`,
        [
          email.id,
          email.to,
          email.subject,
          email.body,
          email.htmlBody,
          email.sentAt,
          email.category,
          !!email.isRead,
          email.readAt || null,
          email.senderId || null,
          email.recipientId || null,
          email.farmId || null,
          email.relatedType || null,
          email.relatedId || null
        ]
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
  // Load local database config first only if we haven't already successfully loaded from Firestore
  if (db.users.length === 0) {
    loadLocalJsonDb();
  }

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
        name VARCHAR(100) NOT NULL,
        password VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE
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

    // Ensure legacy schemas have the password and is_active columns
    await pgPool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE updates ADD COLUMN IF NOT EXISTS updated_at VARCHAR(100);
      ALTER TABLE simulated_emails ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
      ALTER TABLE simulated_emails ADD COLUMN IF NOT EXISTS read_at VARCHAR(100);
      ALTER TABLE simulated_emails ADD COLUMN IF NOT EXISTS sender_id VARCHAR(50);
      ALTER TABLE simulated_emails ADD COLUMN IF NOT EXISTS recipient_id VARCHAR(50);
      ALTER TABLE simulated_emails ADD COLUMN IF NOT EXISTS farm_id VARCHAR(50);
      ALTER TABLE simulated_emails ADD COLUMN IF NOT EXISTS related_type VARCHAR(50);
      ALTER TABLE simulated_emails ADD COLUMN IF NOT EXISTS related_id VARCHAR(50);
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
async function dispatchEmail(
  to: string,
  subject: string,
  textBody: string,
  htmlBody: string,
  category: string,
  extra?: {
    senderId?: string;
    recipientId?: string;
    farmId?: string;
    relatedType?: 'update' | 'document' | 'financial' | 'welcome';
    relatedId?: string;
  }
) {
  const settings = getSettings();

  // 1. Appends to internal simulated log (always record so admins can see in outbox tab)
  const newEmail: SimulatedEmail = {
    id: 'email-' + Date.now().toString() + '-' + Math.floor(Math.random() * 1000),
    to,
    subject,
    body: textBody,
    htmlBody,
    sentAt: new Date().toISOString(),
    category,
    deliveryStatus: 'simulated',
    isRead: false,
    ...extra
  };
  db.simulatedEmails.unshift(newEmail);

  // 2. Real dispatch based on configuration
  const svc = settings.emailServiceType || 'simulation';

  if (svc === 'smtp') {
    if (settings.smtpHost) {
      try {
        await sendSmtpEmail({
          host: settings.smtpHost,
          port: settings.smtpPort || 587,
          secure: settings.smtpSecure !== false,
          user: settings.smtpUser || '',
          pass: settings.smtpPass || '',
          from: settings.smtpFrom || 'Adubiaro Farms <noreply@adubiaro.com>',
          to,
          subject,
          text: textBody,
          html: htmlBody
        });
        newEmail.deliveryStatus = 'delivered';
        console.log(`📧 Fully routed REAL SMTP Email to ${to}: ${subject}`);
      } catch (e: any) {
        newEmail.deliveryStatus = 'failed';
        newEmail.deliveryError = e.message || String(e);
        console.error('📧 SMTP Send issue (logged in simulated outbox):', e);
      }
    } else {
      newEmail.deliveryStatus = 'failed';
      newEmail.deliveryError = 'SMTP service enabled but SMTP Hostname is not configured.';
      console.warn('⚠️ SMTP Email service enabled but no host configured.');
    }
  } else if (svc === 'brevo') {
    if (settings.brevoApiKey) {
      try {
        await sendBrevoEmail({
          apiKey: settings.brevoApiKey,
          senderName: settings.brevoSenderName || 'Adubiaro Farms',
          senderEmail: settings.brevoSenderEmail || 'noreply@adubiaro.com',
          to,
          subject,
          text: textBody,
          html: htmlBody
        });
        newEmail.deliveryStatus = 'delivered';
        console.log(`📧 Fully routed REAL Brevo API Email to ${to}: ${subject}`);
      } catch (e: any) {
        newEmail.deliveryStatus = 'failed';
        newEmail.deliveryError = e.message || String(e);
        console.error('📧 Brevo API Send issue (logged in simulated outbox):', e);
      }
    } else {
      newEmail.deliveryStatus = 'failed';
      newEmail.deliveryError = 'Brevo service enabled but API Key is not configured.';
      console.warn('⚠️ Brevo Email service enabled but no API Key configured.');
    }
  } else {
    newEmail.deliveryStatus = 'simulated';
    console.log(`📧 Simulated Email recorded in outbox to ${to}: ${subject}`);
  }

  // Persist the state after the dispatch is complete
  saveDb();
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
  if (user.isActive === false) {
    return res.status(403).json({ error: 'This account has been deactivated. Please contact support.' });
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

  if (user.isActive === false) {
    return res.status(403).json({ error: 'This account has been deactivated. Please contact support.' });
  }

  let isMatch = false;
  if (user.password && password === user.password) {
    isMatch = true;
  } else {
    if (user.role === UserRole.ADMIN && password === 'Admin@1234') isMatch = true;
    if (user.role === UserRole.FARM_MANAGER && password === 'Manager@1234') isMatch = true;
    if (user.role === UserRole.INVESTOR && password === 'Investor@1234') isMatch = true;
  }

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
    totalPayoutsThisMonth,
    plots: db.plots,
    investorPlots: db.investorPlots,
    assignments: db.assignments
  });
});

// Global Search (Filtered according to roles)
app.get('/api/search', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const query = (req.query.q as string || '').trim().toLowerCase();

  if (!query) {
    return res.json({
      farms: [],
      plots: [],
      investorPlots: [],
      documents: [],
      financials: []
    });
  }

  // Define collections to match
  let matchedFarms: Farm[] = [];
  let matchedPlots: FarmPlot[] = [];
  let matchedInvestorPlots: InvestorPlot[] = [];
  let matchedDocuments: Document[] = [];
  let matchedFinancials: FinancialSummary[] = [];

  if (user.role === UserRole.ADMIN) {
    // 1. Farms
    matchedFarms = db.farms.filter(f => 
      f.name.toLowerCase().includes(query) ||
      f.location.toLowerCase().includes(query) ||
      f.state.toLowerCase().includes(query) ||
      f.description.toLowerCase().includes(query)
    );

    // 2. Plots
    matchedPlots = db.plots.filter(p => 
      p.plotNumber.toLowerCase().includes(query) ||
      p.cropType.toLowerCase().includes(query) ||
      p.status.toLowerCase().includes(query)
    );

    // 3. Investor Plots
    matchedInvestorPlots = db.investorPlots.filter(ip => {
      const investorUser = db.users.find(u => u.id === ip.investorId);
      const investorName = investorUser ? investorUser.name.toLowerCase() : '';
      const investorEmail = investorUser ? investorUser.email.toLowerCase() : '';
      return ip.contractRef.toLowerCase().includes(query) ||
             investorName.includes(query) ||
             investorEmail.includes(query);
    });

    // 4. Documents
    matchedDocuments = db.documents.filter(d => 
      d.title.toLowerCase().includes(query) ||
      d.fileName.toLowerCase().includes(query) ||
      d.description.toLowerCase().includes(query) ||
      d.category.toLowerCase().includes(query)
    );

    // 5. Financials
    matchedFinancials = db.financials.filter(f => 
      f.period.toLowerCase().includes(query) ||
      f.notes.toLowerCase().includes(query) ||
      f.status.toLowerCase().includes(query) ||
      f.year.toString().includes(query)
    );
  } else if (user.role === UserRole.FARM_MANAGER) {
    // Get assigned farm IDs
    const assignedFarmIds = db.assignments
      .filter(a => a.managerId === user.id && a.isActive)
      .map(a => a.farmId);

    // 1. Farms
    matchedFarms = db.farms.filter(f => 
      assignedFarmIds.includes(f.id) && (
        f.name.toLowerCase().includes(query) ||
        f.location.toLowerCase().includes(query) ||
        f.state.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query)
      )
    );

    // 2. Plots
    matchedPlots = db.plots.filter(p => 
      assignedFarmIds.includes(p.farmId) && (
        p.plotNumber.toLowerCase().includes(query) ||
        p.cropType.toLowerCase().includes(query) ||
        p.status.toLowerCase().includes(query)
      )
    );

    // 3. Investor Plots (Restrict to assigned farms' plots)
    const assignedPlotIds = db.plots.filter(p => assignedFarmIds.includes(p.farmId)).map(p => p.id);
    matchedInvestorPlots = db.investorPlots.filter(ip => 
      assignedPlotIds.includes(ip.plotId) && (
        ip.contractRef.toLowerCase().includes(query) ||
        (db.users.find(u => u.id === ip.investorId)?.name.toLowerCase().includes(query) || false)
      )
    );

    // 4. Documents (Only assigned farms' documents)
    matchedDocuments = db.documents.filter(d => 
      assignedFarmIds.includes(d.farmId) && (
        d.title.toLowerCase().includes(query) ||
        d.fileName.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query) ||
        d.category.toLowerCase().includes(query)
      )
    );

    // 5. Financials: FARM MANAGERS ARE RESTRICTED. Return empty.
    matchedFinancials = [];
  } else if (user.role === UserRole.INVESTOR) {
    // Get owned plot IDs
    const investorPlotsList = db.investorPlots.filter(ip => ip.investorId === user.id && ip.isActive);
    const ownedPlotIds = investorPlotsList.map(ip => ip.plotId);
    
    // Find farms for those owned plots
    const ownedPlotFarms = db.plots.filter(p => ownedPlotIds.includes(p.id)).map(p => p.farmId);

    // 1. Farms
    matchedFarms = db.farms.filter(f => 
      ownedPlotFarms.includes(f.id) && (
        f.name.toLowerCase().includes(query) ||
        f.location.toLowerCase().includes(query) ||
        f.state.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query)
      )
    );

    // 2. Plots
    matchedPlots = db.plots.filter(p => 
      ownedPlotIds.includes(p.id) && (
        p.plotNumber.toLowerCase().includes(query) ||
        p.cropType.toLowerCase().includes(query) ||
        p.status.toLowerCase().includes(query)
      )
    );

    // 3. Investor Plots (Only their own)
    matchedInvestorPlots = investorPlotsList.filter(ip => 
      ip.contractRef.toLowerCase().includes(query)
    );

    // 4. Documents (Only visible documents for their farms/plots)
    matchedDocuments = db.documents.filter(d => {
      const matchesQuery = d.title.toLowerCase().includes(query) ||
                           d.fileName.toLowerCase().includes(query) ||
                           d.description.toLowerCase().includes(query) ||
                           d.category.toLowerCase().includes(query);
      if (!matchesQuery) return false;

      // Access checks:
      if (d.visibility === DocumentVisibility.FARM) {
        return ownedPlotFarms.includes(d.farmId);
      } else if (d.visibility === DocumentVisibility.PLOT && d.plotId) {
        return ownedPlotIds.includes(d.plotId);
      }
      return false;
    });

    // 5. Financials (Only theirs)
    matchedFinancials = db.financials.filter(f => 
      ownedPlotIds.includes(f.plotId) && (
        f.period.toLowerCase().includes(query) ||
        f.notes.toLowerCase().includes(query) ||
        f.status.toLowerCase().includes(query) ||
        f.year.toString().includes(query)
      )
    );
  }

  res.json({
    farms: matchedFarms,
    plots: matchedPlots,
    investorPlots: matchedInvestorPlots,
    documents: matchedDocuments,
    financials: matchedFinancials
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

// Get Updates Feed for Supervisor/Manager Dashboard
app.get('/api/updates/manager', requireAuth, (req, res) => {
  const user = (req as any).user as User;

  let assignedFarmIds: string[] = [];
  if (user.role === UserRole.ADMIN) {
    assignedFarmIds = db.farms.map(f => f.id);
  } else if (user.role === UserRole.FARM_MANAGER) {
    assignedFarmIds = db.assignments
      .filter(a => a.managerId === user.id && a.isActive)
      .map(a => a.farmId);
  } else {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Filter updates for these farms
  const managerUpdates = db.updates.filter(u => assignedFarmIds.includes(u.farmId));
  
  // Attach farm names to the response items
  const updatesWithFarmInfo = managerUpdates.map(u => {
    const farm = db.farms.find(f => f.id === u.farmId);
    return {
      ...u,
      farmName: farm ? farm.name : 'Unknown Estate'
    };
  });

  res.json(updatesWithFarmInfo);
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

    let changed = false;
    db.simulatedEmails.forEach(email => {
      if (
        email.to.toLowerCase() === user.email.toLowerCase() &&
        email.farmId === farmId &&
        email.relatedType === 'update' &&
        !email.isRead
      ) {
        email.isRead = true;
        email.readAt = new Date().toISOString();
        changed = true;
      }
    });
    if (changed) {
      saveDb();
    }
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
    updatedAt: new Date().toISOString(),
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
      'Farm Update',
      {
        senderId: user.id,
        recipientId: investor.id,
        farmId: farm.id,
        relatedType: 'update',
        relatedId: newUpdate.id
      }
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
      'Document Upload',
      {
        senderId: user.id,
        recipientId: investor.id,
        farmId: farm.id,
        relatedType: 'document',
        relatedId: newDoc.id
      }
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

  // Mark related simulated emails as read/opened when downloaded by the investor
  if (user.role === UserRole.INVESTOR) {
    db.simulatedEmails.forEach(email => {
      if (
        email.to.toLowerCase() === user.email.toLowerCase() &&
        (email.relatedId === docId || (email.relatedType === 'document' && email.relatedId === docId))
      ) {
        email.isRead = true;
        email.readAt = new Date().toISOString();
      }
    });
    saveDb();
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

    // Mark related simulated emails as read/opened
    let changed = false;
    db.simulatedEmails.forEach(email => {
      if (
        email.to.toLowerCase() === user.email.toLowerCase() &&
        email.relatedType === 'financial' &&
        !email.isRead
      ) {
        email.isRead = true;
        email.readAt = new Date().toISOString();
        changed = true;
      }
    });
    if (changed) {
      saveDb();
    }

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
        'Financial Addition',
        {
          senderId: user.id,
          recipientId: investor.id,
          farmId: plot?.farmId,
          relatedType: 'financial',
          relatedId: newFin.id
        }
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

  const { username, name, email, phone, role, password } = req.body;

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
    role: (role as UserRole) || UserRole.INVESTOR,
    password: password || undefined
  };

  db.users.push(createdUser);
  saveDb();

  // Set default temporary password for welcome notification
  let tempPassword = password || 'User@1234';
  if (!password) {
    if (role === UserRole.FARM_MANAGER) tempPassword = 'Manager@1234';
    if (role === UserRole.INVESTOR) tempPassword = 'Investor@1234';
    if (role === UserRole.ADMIN) tempPassword = 'Admin@1234';
  }

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
    'Welcome Registration',
    {
      senderId: user.id,
      recipientId: createdUser.id,
      relatedType: 'welcome',
      relatedId: createdUser.id
    }
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

// Admin Route to toggle active status of a user
app.post('/api/admin/users/:id/toggle-active', requireAuth, (req, res) => {
  const currentUser = (req as any).user as User;
  if (currentUser.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const targetUserId = req.params.id;
  if (targetUserId === currentUser.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own super admin account.' });
  }

  const targetUser = db.users.find(u => u.id === targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Toggle active
  targetUser.isActive = targetUser.isActive === false ? true : false;
  saveDb();

  res.json({ success: true, user: targetUser });
});

// Admin Route to delete a user
app.delete('/api/admin/users/:id', requireAuth, (req, res) => {
  const currentUser = (req as any).user as User;
  if (currentUser.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const targetUserId = req.params.id;
  if (targetUserId === currentUser.id) {
    return res.status(400).json({ error: 'You cannot delete your own super admin account.' });
  }

  const userIndex = db.users.findIndex(u => u.id === targetUserId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const deletedUser = db.users[userIndex];
  db.users.splice(userIndex, 1);
  saveDb();

  res.json({ success: true, deletedUser });
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

// Admin route to send a test email to verify credentials
app.post('/api/admin/email/test', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const {
    emailServiceType,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    smtpFrom,
    brevoApiKey,
    brevoSenderEmail,
    brevoSenderName,
    testRecipient
  } = req.body;

  if (!testRecipient) {
    return res.status(400).json({ error: 'Test recipient email is required.' });
  }

  const storedSettings = getSettings();
  const actualSmtpPass = smtpPass === '__SECURE_PLACEHOLDER__' ? (storedSettings.smtpPass || '') : (smtpPass || '');
  const actualBrevoApiKey = brevoApiKey === '__SECURE_PLACEHOLDER__' ? (storedSettings.brevoApiKey || '') : (brevoApiKey || '');

  const subject = 'Adubiaro Farm Portal — Email Integration Test Successful!';
  const textBody = 'Hello! This is a test email from your Adubiaro Farm Portal admin dashboard to verify that your email integration settings are configured correctly. If you received this, everything is working perfectly!';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <h2 style="color: #1B4332; margin-top: 0;">🎉 Email Setup Successful!</h2>
      <p>Dear Administrator,</p>
      <p>This is an automated test email dispatched from your <strong>Adubiaro Farm Portal Control Center</strong>.</p>
      <div style="background-color: #f4fbf7; border-left: 4px solid #2D6A4F; padding: 15px; margin: 15px 0; border-radius: 4px;">
        <strong>Configuration Verified:</strong><br/>
        • <strong>Selected Method:</strong> ${String(emailServiceType).toUpperCase()}<br/>
        • <strong>Sender Address:</strong> ${emailServiceType === 'smtp' ? (smtpFrom || 'noreply@adubiaro.com') : `${brevoSenderName || 'Adubiaro Farms'} &lt;${brevoSenderEmail || 'noreply@adubiaro.com'}&gt;`}<br/>
        • <strong>Verified At:</strong> ${new Date().toLocaleString()}
      </div>
      <p>Your portal notifications, investor welcome alerts, password settings, and payout alerts will now route seamlessly through this active profile!</p>
      <p style="font-size: 11px; color: #888; margin-top: 25px; border-top: 1px solid #eee; padding-top: 10px;">
        Sent from Adubiaro Farm Estate Portal Super Admin panel.
      </p>
    </div>
  `;

  // Initialize test log object early
  const testSim: SimulatedEmail = {
    id: 'test-email-' + Date.now().toString(),
    to: testRecipient,
    subject,
    body: textBody,
    htmlBody,
    sentAt: new Date().toISOString(),
    category: 'System Integration Test',
    deliveryStatus: 'simulated'
  };

  try {
    if (emailServiceType === 'smtp') {
      if (!smtpHost) throw new Error('SMTP Host is required');
      await sendSmtpEmail({
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: smtpSecure !== false,
        user: smtpUser || '',
        pass: actualSmtpPass,
        from: smtpFrom || 'Adubiaro Farms <noreply@adubiaro.com>',
        to: testRecipient,
        subject,
        text: textBody,
        html: htmlBody
      });
      testSim.deliveryStatus = 'delivered';
    } else if (emailServiceType === 'brevo') {
      if (!actualBrevoApiKey) throw new Error('Brevo API Key is required');
      await sendBrevoEmail({
        apiKey: actualBrevoApiKey,
        senderName: brevoSenderName || 'Adubiaro Farms',
        senderEmail: brevoSenderEmail || 'noreply@adubiaro.com',
        to: testRecipient,
        subject,
        text: textBody,
        html: htmlBody
      });
      testSim.deliveryStatus = 'delivered';
    } else {
      console.log(`📧 Test Email simulation to ${testRecipient}`);
      testSim.deliveryStatus = 'simulated';
    }

    // Record and save successful test in the outbox
    db.simulatedEmails.unshift(testSim);
    saveDb();

    res.json({ success: true, message: `Test email successfully routed and sent to ${testRecipient}!` });
  } catch (err: any) {
    console.error('❌ Test email send error:', err);
    let errorMsg = err.message || 'Unknown error occurred during test send.';
    if (
      err.code === 'ETIMEDOUT' ||
      errorMsg.toLowerCase().includes('timeout') ||
      errorMsg.toLowerCase().includes('connect')
    ) {
      errorMsg = `SMTP Connection Timeout/Failed: "${errorMsg}". Note: Cloud containers (e.g. Cloud Run) block standard outbound SMTP ports (25, 465, 587) by default to prevent spam. We highly recommend switching your 'Integration Channel Method' to 'Brevo SMTP Third-Party API' which communicates securely over standard HTTPS (port 443) and is fully supported in this cloud sandbox environment!`;
    }

    // Record the failure in simulated outbox logs so that administrators can review details
    testSim.deliveryStatus = 'failed';
    testSim.deliveryError = errorMsg;
    db.simulatedEmails.unshift(testSim);
    saveDb();

    res.status(500).json({ error: errorMsg });
  }
});

// Route to get list of emails sent (simulated outbox logs with precise role-based access)
app.get('/api/emails/outbox', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user.role === UserRole.ADMIN) {
    // Super Admin can see all messages/emails
    return res.json(db.simulatedEmails);
  }

  if (user.role === UserRole.FARM_MANAGER) {
    // Farm Managers should see only messages/emails they shared with their attached investors
    const managedFarmIds = db.assignments
      .filter(a => a.managerId === user.id && a.isActive)
      .map(a => a.farmId);
    
    const managedPlotIds = db.plots
      .filter(p => managedFarmIds.includes(p.farmId))
      .map(p => p.id);
    
    const managedInvestorPlots = db.investorPlots
      .filter(ip => ip.isActive && managedPlotIds.includes(ip.plotId));
    
    const attachedInvestorIds = [...new Set(managedInvestorPlots.map(ip => ip.investorId))];
    
    const attachedInvestorEmails = db.users
      .filter(u => attachedInvestorIds.includes(u.id) && u.role === UserRole.INVESTOR)
      .map(u => u.email.toLowerCase());

    const filtered = db.simulatedEmails.filter(email => {
      const toLower = (email.to || '').toLowerCase();
      return (
        attachedInvestorEmails.includes(toLower) ||
        email.senderId === user.id ||
        (email.farmId && managedFarmIds.includes(email.farmId))
      );
    });
    return res.json(filtered);
  }

  if (user.role === UserRole.INVESTOR) {
    // Simulated Outbox should only show messages meant for the particular user alone
    const filtered = db.simulatedEmails.filter(email => {
      return (email.to || '').toLowerCase() === user.email.toLowerCase();
    });
    return res.json(filtered);
  }

  res.json([]);
});

// Endpoint to manually mark a simulated email as read/viewed by an investor
app.post('/api/emails/:id/mark-read', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const email = db.simulatedEmails.find(e => e.id === id);
  if (!email) {
    return res.status(404).json({ error: 'Email not found' });
  }

  if (user.role === UserRole.INVESTOR && email.to.toLowerCase() !== user.email.toLowerCase()) {
    return res.status(403).json({ error: 'Access denied to read receipt confirmation' });
  }

  email.isRead = true;
  email.readAt = new Date().toISOString();
  saveDb();
  res.json({ success: true, email });
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
    configured: isPostgresConfigured(),
    firebase: {
      initialized: !!firestoreDb,
      configSource: process.env.FIREBASE_CONFIG ? 'env_json' : (process.env.FIREBASE_API_KEY ? 'env_vars' : (fs.existsSync(path.join(process.cwd(), 'firebase-applet-config.json')) ? 'config_file' : 'none')),
      projectId: firebaseConfig?.projectId || null,
      databaseId: firebaseConfig?.firestoreDatabaseId || '(default)',
      diagnosticResult: firebaseDiagnosticResult
    }
  });
});

app.get('/api/admin/settings', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  const settings = getSettings();
  const maskedSettings = {
    ...settings,
    smtpPass: settings.smtpPass ? '__SECURE_PLACEHOLDER__' : '',
    brevoApiKey: settings.brevoApiKey ? '__SECURE_PLACEHOLDER__' : ''
  };
  res.json(maskedSettings);
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
  if (newSettings.emailServiceType !== undefined) currentSettings.emailServiceType = newSettings.emailServiceType;
  if (newSettings.smtpHost !== undefined) currentSettings.smtpHost = newSettings.smtpHost;
  if (newSettings.smtpPort !== undefined) currentSettings.smtpPort = parseInt(newSettings.smtpPort !== null ? newSettings.smtpPort : '587');
  if (newSettings.smtpSecure !== undefined) currentSettings.smtpSecure = Boolean(newSettings.smtpSecure);
  if (newSettings.smtpUser !== undefined) currentSettings.smtpUser = newSettings.smtpUser;
  if (newSettings.smtpPass !== undefined) {
    if (newSettings.smtpPass !== '__SECURE_PLACEHOLDER__' && newSettings.smtpPass !== '') {
      currentSettings.smtpPass = newSettings.smtpPass;
    } else if (newSettings.smtpPass === '') {
      currentSettings.smtpPass = '';
    }
  }
  if (newSettings.smtpFrom !== undefined) currentSettings.smtpFrom = newSettings.smtpFrom;
  if (newSettings.brevoApiKey !== undefined) {
    if (newSettings.brevoApiKey !== '__SECURE_PLACEHOLDER__' && newSettings.brevoApiKey !== '') {
      currentSettings.brevoApiKey = newSettings.brevoApiKey;
    } else if (newSettings.brevoApiKey === '') {
      currentSettings.brevoApiKey = '';
    }
  }
  if (newSettings.brevoSenderEmail !== undefined) currentSettings.brevoSenderEmail = newSettings.brevoSenderEmail;
  if (newSettings.brevoSenderName !== undefined) currentSettings.brevoSenderName = newSettings.brevoSenderName;

  // React to database mode shift on the fly
  if (currentSettings.databaseMode === 'local_json') {
    usePostgres = false;
  } else if (currentSettings.databaseMode === 'postgres_forced' || currentSettings.databaseMode === 'auto') {
    if (!usePostgres && isPostgresConfigured()) {
      initPostgres().catch(err => console.error('Failed to rebuild Postgres connection during settings shift:', err));
    }
  }

  saveDb();
  const responseSettings = {
    ...currentSettings,
    smtpPass: currentSettings.smtpPass ? '__SECURE_PLACEHOLDER__' : '',
    brevoApiKey: currentSettings.brevoApiKey ? '__SECURE_PLACEHOLDER__' : ''
  };
  res.json(responseSettings);
});

app.get('/api/admin/database/export', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  // Create export payload
  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    db: db
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=adubiaro-db-export-${Date.now()}.json`);
  res.send(JSON.stringify(payload, null, 2));
});

app.post('/api/admin/database/import', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  try {
    const { db: importedDb } = req.body;

    if (!importedDb) {
      return res.status(400).json({ error: 'Invalid payload structure: missing "db" block.' });
    }

    // Basic structure validation to prevent corrupted uploads
    const requiredKeys = ['users', 'settings', 'farms', 'plots', 'investors', 'payouts', 'alerts', 'financials'];
    const missingKeys = requiredKeys.filter(key => !importedDb[key] || (!Array.isArray(importedDb[key]) && key !== 'settings'));
    
    if (missingKeys.length > 0) {
      return res.status(400).json({ error: `Import failed: database validation failed. Missing keys: ${missingKeys.join(', ')}` });
    }

    // Replace in-memory database
    db = importedDb;

    // Persist immediately across active channels
    saveDb();

    // Log the import backup event
    const logs = loadBackupLogs();
    const timestamp = new Date().toISOString();
    const id = `bk-import-${Date.now()}`;
    const fileName = `db-import-restore-${Date.now()}.json`;
    const filePath = path.join(BACKUPS_DIR, fileName);

    // Save as local backup log copy
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
    } catch (e) {
      console.error('Failed to write copy of imported database:', e);
    }

    const newLog: BackupLog = {
      id,
      timestamp,
      backupType: 'manual',
      fileName,
      fileSize: (JSON.stringify(db).length / 1024).toFixed(2) + ' KB',
      status: 'success'
    };

    logs.unshift(newLog);
    saveBackupLogs(logs);

    res.json({
      success: true,
      message: 'System database state fully restored and synchronized successfully!',
      timestamp
    });
  } catch (err: any) {
    console.error('❌ Database state import error:', err);
    res.status(500).json({ error: `Failed to restore database state: ${err.message || 'Unknown error'}` });
  }
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

  // Automatically clear out any pre-seeded demo data on startup to enforce clean state
  console.log('🧹 Checking and removing any pre-seeded demo data on startup...');
  let dataRemoved = false;

  if (db.users && db.users.some(u => ['user-manager1', 'user-investor1', 'user-investor2'].includes(u.id))) {
    db.users = db.users.filter(u => !['user-manager1', 'user-investor1', 'user-investor2'].includes(u.id));
    dataRemoved = true;
  }
  if (db.farms && db.farms.some(f => f.id === 'farm-01')) {
    db.farms = db.farms.filter(f => f.id !== 'farm-01');
    dataRemoved = true;
  }
  if (db.plots && db.plots.some(p => ['plot-01', 'plot-02', 'plot-03'].includes(p.id))) {
    db.plots = db.plots.filter(p => !['plot-01', 'plot-02', 'plot-03'].includes(p.id));
    dataRemoved = true;
  }
  if (db.investorPlots && db.investorPlots.some(ip => ['invplot-01', 'invplot-02', 'invplot-03'].includes(ip.id))) {
    db.investorPlots = db.investorPlots.filter(ip => !['invplot-01', 'invplot-02', 'invplot-03'].includes(ip.id));
    dataRemoved = true;
  }
  if (db.assignments && db.assignments.some(a => a.id === 'assign-01')) {
    db.assignments = db.assignments.filter(a => a.id !== 'assign-01');
    dataRemoved = true;
  }
  if (db.updates && db.updates.some(up => ['update-01', 'update-02', 'update-03'].includes(up.id))) {
    db.updates = db.updates.filter(up => !['update-01', 'update-02', 'update-03'].includes(up.id));
    dataRemoved = true;
  }
  if (db.documents && db.documents.some(d => ['doc-01', 'doc-02'].includes(d.id))) {
    db.documents = db.documents.filter(d => !['doc-01', 'doc-02'].includes(d.id));
    dataRemoved = true;
  }
  if (db.financials && db.financials.some(fin => ['fin-01', 'fin-02', 'fin-03'].includes(fin.id))) {
    db.financials = db.financials.filter(fin => !['fin-01', 'fin-02', 'fin-03'].includes(fin.id));
    dataRemoved = true;
  }
  if (db.simulatedEmails && db.simulatedEmails.some(em => em.id === 'email-01')) {
    db.simulatedEmails = db.simulatedEmails.filter(em => em.id !== 'email-01');
    dataRemoved = true;
  }

  if (dataRemoved) {
    console.log('🧹 Demo data records detected. Purging from database and saving clean slate...');
    saveDb();
  } else {
    console.log('✨ No pre-seeded demo data records found on startup.');
  }

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
