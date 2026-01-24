export interface ServiceOrder {
  id: string;
  osNumber: number;
  entryDate: string; // ISO string
  customerName: string;
  brand: string;
  serviceValue: number;
  commissionValue: number;
  status: 'PENDING' | 'PAID';
  periodId: string;
  createdAt: string;
  paidAt?: string | null;
  paymentMethod?: 'PIX' | 'CASH' | 'CARD' | 'TRANSFER' | '';
  history?: AuditLogEntry[];
}

export interface AuditLogEntry {
  timestamp: string;
  user: string;
  action: string;
  details?: string;
}

export interface Period {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  paid: boolean;
  paidAt?: string;
  totalOrders: number;
  totalServiceValue: number;
  totalCommission: number;
}

export interface AppSettings {
  fixedCommissionPercentage: number;
  companyName?: string;
  companyCnpj?: string;
  companyAddress?: string;
  companyContact?: string;
  companyLogoUrl?: string;
  primaryColor?: string; // Hex code for PDF branding
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Brand {
  id: string;
  name: string;
  createdAt: string;
}

export enum CommissionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID'
}