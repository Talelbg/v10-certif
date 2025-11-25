
// 1.1 Hierarchy & Permissions
export enum UserRole {
  SUPER_ADMIN = 'Super Admin (Global)',
  REGIONAL_ADMIN = 'Regional Admin (Multi-partner)',
  COMMUNITY_ADMIN = 'Community Admin (Single partner)',
}

export interface AdminUser {
  id: string; // uid
  name: string;
  email: string;
  role: UserRole;
  assignedCodes: string[]; // For Regional (List) or Community (Single)
  lastLogin: string;
  status: 'Active' | 'Invited' | 'Disabled';
}

// Official Master List of Communities
export interface CommunityMasterRecord {
    code: string; // Primary Key e.g. HEDERA-FR-PARIS
    name: string; // e.g. Hedera Paris
    region: string; // e.g. EMEA
    managerEmail?: string;
}

// 2.1 & 3.1 The Master Data Schema (Firestore 'developers' collection)
export interface DeveloperRecord {
  id: string; // Firestore Document ID (UUID)
  
  // PII & Identity
  email: string; // Unique Index
  firstName: string;
  lastName: string;
  phone: string;
  country: string; // Normalized
  
  // Booleans
  acceptedMembership: boolean;
  acceptedMarketing: boolean;
  
  // Web3
  walletAddress: string; // Critical for Sybil checks
  
  // Community Logic
  partnerName: string; // Display Name
  partnerCode: string; // Grouping Key (HEDERA-FR)
  
  // Certification Data
  percentageCompleted: number; // 0-100
  createdAt: string; // ISO 8601 (Start Date)
  completedAt: string | null; // ISO 8601 (Certification Date)
  finalScore: number;
  finalGrade: 'Pass' | 'Fail' | 'Pending';
  caStatus: string;
  
  // Computed Fields (Server-side / Ingestion logic)
  computed_duration?: number; // Hours
  computed_riskFlags: string[]; // ["Speed Run", "Sybil", "Bot Activity"]
  ingestionBatchId?: string; // Link to source file
  
  // Legacy / UI Helpers (Optional)
  dataError?: boolean;
}

// Dataset Versioning ('batches' collection)
export interface DatasetVersion {
    id: string;
    fileName: string;
    uploadDate: string;
    recordCount: number;
    uploadedBy?: string;
    data: DeveloperRecord[]; // In-memory cache for this app version
}

// 3.2 Module B: Invoicing & Agreements
export enum InvoiceStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
  VOID = 'Void'
}

export type PaymentModel = 'Per_Certification' | 'Fixed_Recurring';
export type BillingCycle = 'Monthly' | 'Bimonthly' | 'Quarterly';
export type Currency = 'HBAR' | 'USDC' | 'USD' | 'EUR';
export type PaymentMethod = 'Crypto_Wallet' | 'Bank_Transfer';

export interface CommunityAgreement {
    id: string;
    partnerCode: string;
    partnerName: string;
    
    // Responsible Person
    contactName: string;
    contactEmail: string;
    assignedAdminId?: string;

    // Billing Details
    billingAddress: string;
    taxId?: string;

    // Contract Duration
    startDate: string;
    endDate: string;
    isActive: boolean;

    // Financials
    paymentModel: PaymentModel;
    unitPrice: number;
    currency: Currency;
    billingCycle: BillingCycle;
    preferredMethod: PaymentMethod;
    paymentTerms: 'Due on Receipt' | 'Net 15' | 'Net 30';
    
    walletAddress?: string;
    bankDetails?: string;
    
    description: string;
    documents: string[];
    lastUpdated: string;
}

export interface InvoiceLineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  partnerCode: string;
  billingPeriod: string; // YYYY-MM
  
  issueDate: string;
  dueDate: string;

  currency: Currency;
  items: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;

  status: InvoiceStatus;
  notes: string;
  publicMemo: string;
  
  paidAt?: string;
  transactionReference?: string;
}

// 3.3 Module C: Events
export interface CommunityEvent {
  id: string;
  title: string;
  objective: string;
  date: string;
  startTime?: string;
  endTime?: string;
  format: 'Online' | 'In-Person';
  meetingLink?: string;
  location: string;
  partnerCode: string;
  facilitators: string[];
  invitedCount: number;
  rsvpedCount: number;
  checkedInCount: number;
}

// 4.1 AI Insights
export interface DashboardMetrics {
  totalRegistered: number;
  totalCertified: number;
  usersStartedCourse: number;
  usersStartedCoursePct: number;
  activeCommunities: number;
  avgCompletionTimeDays: number;
  certificationRate: number;
  overallSubscriberRate: number;
  potentialFakeAccounts: number; // Count of records with computed_riskFlags.length > 0
  potentialFakeAccountsPct: number;
  rapidCompletions: number;
}

export interface ChartDataPoint {
  name: string;
  registrations: number;
  certifications: number;
}

// Membership Metrics
export interface MembershipMetrics {
    totalEnrolled: number;
    totalMembers: number; // acceptedMembership = true
    membershipRate: number;
    certifiedMembers: number;
    certifiedMemberRate: number;
    activeCommunities: number;
}

export interface MembershipChartPoint {
    name: string;
    enrollees: number;
    newMembers: number;
}

// Timeframe Filter Types
export type TimeframeOption = 'All Time' | 'This Year' | 'Last 90 Days' | 'Last 30 Days' | 'Custom Range';

export interface DateRange {
    start: Date | null;
    end: Date | null;
}

// Smart Outreach Types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  trigger: 'Manual' | 'Automated';
}

export interface OutreachCampaign {
  id: string;
  name: string;
  audienceSize: number;
  sentCount: number;
  status: 'Draft' | 'Sending' | 'Completed';
  sentAt: string;
  templateId: string;
}

// Reporting Context
export interface ReportingContext {
    current: DashboardMetrics;
    prev: DashboardMetrics;
    global: DashboardMetrics;
}
