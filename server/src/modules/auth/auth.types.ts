export type LoginData = {
  email: string;
  password: string;
};

export type RegisterData = {
  email: string;
  password: string;
  name?: string | null;
};

export type NewUser = {
  email: string;
  password: string;
  name?: string | null;
};

export type User = {
  id: string;
  email: string;
  password: string;
  name?: string | null;
  createdAt?: Date;
};

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface NewUser {
  email: string;
  password: string;
  name?: string | null;
}
