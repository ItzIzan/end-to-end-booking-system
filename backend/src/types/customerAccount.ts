export interface CustomerAccount {
  id: number;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerAccountInput {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
}