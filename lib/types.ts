// Types centralisés pour les sessions et les lignes DB

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  isPremium?: boolean;
}

// Lignes DB
export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  stripe_customer_id: string | null;
  is_premium: boolean;
  created_at: string;
}

export interface CourseProgressRow {
  user_id: number;
  course_id: number;
  visited_at: string;
}

export interface QuizResultRow {
  id: number;
  user_id: number;
  course_id: number;
  score: number;
  total: number;
  completed_at: string;
}
