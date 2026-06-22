export type SkinTone = "very fair" | "fair" | "wheatish" | "dusky" | "dark";
export type Undertone = "warm" | "cool" | "neutral";
export type Verdict = "great_match" | "decent" | "skip_it";

export interface Profile {
  id: string;
  email: string;
  name?: string;
  gender?: string;
  age?: number;
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hip: number;
  preferred_size: string;
  skin_tone: SkinTone;
  undertone: Undertone;
  body_goal?: string;
  occasion: string;
  favorite_colors?: string[];
  preferred_styles?: string[];
  body_photo_url?: string;
}

export interface AnalysisFeedback {
  fit_feedback: string;
  color_feedback: string;
  occasion_feedback: string;
  body_goal_feedback: string;
  improvement_tips: string[];
  better_colors: string[];
  pair_with: string[];
  local_tip: string;
}

export interface WardrobeItem {
  id: string;
  user_id: string;
  image_url: string;
  category: string;
  color: string;
  created_at: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  product_image_url: string;
  product_link: string;
  tryon_result_url: string;
  fit_score: number;
  color_score: number;
  occasion_score: number;
  verdict: Verdict;
  feedback: AnalysisFeedback;
  created_at: string;
}
