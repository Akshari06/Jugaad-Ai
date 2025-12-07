
export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number; // Selling Price
  expiryDate?: string; // ISO Date string
  image?: string; // URL for product image
}

export interface SaleItem {
  name: string;
  quantity: number;
  price?: number;
}

export interface SaleRecord {
  id: string;
  items: SaleItem[];
  totalAmount: number;
  date: string;
}

export interface ExpenseRecord {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'customer';
  type: 'text' | 'image' | 'audio';
  content: string; // Text content or URL for media
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  mediaData?: string; // Base64 for images/audio
  orderData?: SaleItem[]; // Optional structured data for customer orders
  suggestedActions?: { label: string; actionType: string; data?: any }[];
}

export interface AiResponse {
  text: string;
  action?: 'UPDATE_INVENTORY' | 'RECORD_SALE' | 'NONE';
  data?: any;
}

export interface UserProfile {
  shopName: string;
  ownerName: string;
  email: string;
  language: string;
}
