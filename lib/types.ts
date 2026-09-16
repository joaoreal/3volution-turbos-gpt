export const CATEGORIES = [
  "Peças de Turbo",
  "Linhas de Escape",
  "Turbos Novos",
  "Reparações de Turbos",
  "Hibridações de Turbos",
  "Preparações de Turbos"
] as const;

export const STATUSES = [
  "Recebido",
  "Em diagnóstico",
  "Em reparação",
  "Pronto",
  "Entregue"
] as const;

export type Category = (typeof CATEGORIES)[number];
export type WorkStatus = (typeof STATUSES)[number];
export type PhotoPhase = "before" | "after";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  nif: string | null;
  email: string | null;
  address: string | null;
}

export interface WorkOrder {
  id: string;
  order_number: string;
  customer_id: string;
  category: Category;
  status: WorkStatus;
  received_at: string;
  delivered_at: string | null;
  vehicle_brand_model: string | null;
  license_plate: string | null;
  engine: string | null;
  turbo_reference: string | null;
  issue_description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer | null;
}

export interface WorkOrderPhoto {
  id: string;
  work_order_id: string;
  phase: PhotoPhase;
  storage_path: string;
  created_at: string;
  signedUrl?: string;
}

export interface StatusHistory {
  id: string;
  work_order_id: string;
  status: WorkStatus;
  changed_at: string;
  changed_by: string | null;
}

export interface SearchResult {
  order_id: string;
  order_number: string;
  customer_name: string;
  phone: string | null;
  nif: string | null;
  category: Category;
  status: WorkStatus;
  received_at: string;
  license_plate: string | null;
}
