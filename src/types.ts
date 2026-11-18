export interface Professional {
  id: string;
  name: string;
  role: string;
  category: 'GRADUADOS' | 'SOLDADOS';
  rank?: string;
  specialty?: string;
  sort_order?: number;
  valid_from_month?: number;
  valid_from_year?: number;
  valid_until_month?: number;
  valid_until_year?: number;
}

export interface MonthOption {
  value: number; // 0-11
  label: string;
}

export interface YearOption {
  value: number;
  label: string;
}

export interface Signer {
  id: string;
  fullName: string;
  warName: string;
  rank: string;
  role: string;
}

