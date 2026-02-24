export type VerificationStatus = "verified" | "pending" | "rejected";

export type Resident = {
  id: number;
  user_id: number;
  name: string;
  address: string | null;
  phone_number: string | null;
  valid_id_url: string | null;
  face_photo_url: string | null;
  verification_status: VerificationStatus;
  birthdate: string | null;
  sex: string | null;
  must_change_password: boolean;
  created_at: string;
  email?: string;
};

export type ResidentWithUser = Resident & {
  users: {
    email: string;
    auth_id: string;
  };
};

export type CreateResidentInput = {
  email: string;
  password: string;
  name: string;
  address?: string;
  phone_number?: string;
  birthdate?: string;
  valid_id_url?: string;
  face_photo_url?: string;
  sex?: string;
};

export type UpdateResidentInput = {
  name?: string;
  address?: string;
  phone_number?: string;
  birthdate?: string;
  verification_status?: VerificationStatus;
  valid_id_url?: string;
  face_photo_url?: string;
  sex?: string;
  must_change_password?: boolean;
};
