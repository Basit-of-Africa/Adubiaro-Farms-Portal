/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'admin',
  FARM_MANAGER = 'farm_manager',
  INVESTOR = 'investor'
}

export enum PlotStatus {
  AVAILABLE = 'available',
  ACTIVE = 'active',
  HARVESTING = 'harvesting',
  DORMANT = 'dormant'
}

export enum UpdateType {
  GENERAL = 'general',
  PLANTING = 'planting',
  GROWTH = 'growth',
  HARVEST = 'harvest',
  MAINTENANCE = 'maintenance',
  WEATHER = 'weather',
  PEST = 'pest',
  MILESTONE = 'milestone'
}

export enum DocumentCategory {
  CONTRACT = 'contract',
  CERTIFICATE = 'certificate',
  REPORT = 'report',
  FINANCIAL = 'financial',
  LEGAL = 'legal',
  OTHER = 'other'
}

export enum DocumentVisibility {
  FARM = 'farm',
  PLOT = 'plot'
}

export enum FinancialStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
  OVERDUE = 'overdue'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  phone: string;
  profilePhoto?: string;
  email: string;
  name: string;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  state: string;
  totalPlots: number;
  totalHectares: number;
  description: string;
  coverImage?: string;
  dateEstablished: string;
  isActive: boolean;
}

export interface FarmPlot {
  id: string;
  farmId: string;
  plotNumber: string;
  sizeHectares: number;
  cropType: string;
  status: PlotStatus;
}

export interface InvestorPlot {
  id: string;
  investorId: string;
  plotId: string;
  investmentAmount: number;
  ownershipPercentage: number;
  startDate: string;
  contractRef: string;
  isActive: boolean;
}

export interface FarmManagerAssignment {
  id: string;
  managerId: string;
  farmId: string;
  assignedDate: string;
  isActive: boolean;
}

export interface UpdatePhoto {
  id: string;
  updateId: string;
  image: string; // Base64 or URL
  caption: string;
}

export interface FarmUpdate {
  id: string;
  farmId: string;
  postedBy: string; // User ID
  postedByName: string; // User display name
  title: string;
  body: string;
  updateType: UpdateType;
  isPublished: boolean;
  createdAt: string;
  photos: UpdatePhoto[];
}

export interface Document {
  id: string;
  farmId: string;
  plotId?: string; // Null if visible to all farm investors
  uploadedBy: string; // User ID
  uploadedByName: string;
  title: string;
  fileUrl: string; // Can be Cloudinary URL or local data URL
  fileName: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  description: string;
  uploadedAt: string;
}

export interface FinancialSummary {
  id: string;
  plotId: string; // plot FK
  uploadedBy: string; // Admin User ID
  period: string; // Q1, Q2, Q3, Q4, annual
  year: number;
  roiPercentage: number;
  payoutAmount: number;
  payoutDate: string;
  status: FinancialStatus;
  notes: string;
}

export interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  htmlBody: string;
  sentAt: string;
  category: string;
}
