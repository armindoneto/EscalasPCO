export interface ProfessionalDayDuty {
  day: number;
  shift: string;
}

export interface ParsedProfessional {
  name: string;
  days: ProfessionalDayDuty[];
}

export interface ParsedScale {
  role: string;
  month?: string;
  year?: number;
  professionals: ParsedProfessional[];
}

export interface Professional {
  id: string;
  name: string;
  role: string;
  category: 'GRADUADOS' | 'SOLDADOS';
  rank?: string;
  specialty?: string;
  sort_order?: number;
}

export interface UploadSlot {
  id: string;
  defaultRole: string;
  fileName: string | null;
  status: 'idle' | 'queued' | 'uploading' | 'success' | 'error';
  roleExtracted: string | null;
  errorMsg: string | null;
  parsedCount: number | null;
  fileToProcess?: any;
}

export interface MonthOption {
  value: number; // 0-11
  label: string;
}

export interface YearOption {
  value: number;
  label: string;
}

export interface CoverageStats {
  day: number;
  count: number;
  rolesPresent: { [role: string]: number };
}

export interface Signer {
  id: string;
  fullName: string;
  warName: string;
  rank: string;
  role: string;
}

