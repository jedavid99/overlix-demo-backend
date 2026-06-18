export interface User {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role_id?: string;
  status: UserStatus;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}
