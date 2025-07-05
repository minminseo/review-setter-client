export type UUID = string;

export type ThemeColor = 'dark' | 'light';
export type Language = 'ja' | 'en';
export type Timezone = string;

export interface CreateUserInput {
    email: string;
    password: string;
    timezone: Timezone;
    theme_color: ThemeColor;
    language: Language;
}

export interface LoginUserInput {
    email: string;
    password: string;
}

export interface LoginUserOutput {
    theme_color: ThemeColor;
    language: Language;
}

export interface VerifyEmailRequest {
    email: string;
    code: string;
}

export interface VerifyEmailResponse {
    theme_color: ThemeColor;
    language: Language;
}

export interface GetUserOutput {
    email: string;
    timezone: Timezone;
    theme_color: ThemeColor;
    language: Language;
}

export interface UpdateUserInput {
    email?: string;
    timezone?: Timezone;
    theme_color?: ThemeColor;
    language?: Language;
}

export interface UpdateUserOutput extends GetUserOutput { }

export interface UpdatePasswordRequest {
    password: string;
}

export interface CreateCategoryInput {
    name: string;
}

export interface UpdateCategoryInput extends CreateCategoryInput { }

export interface GetCategoryOutput {
    id: UUID;
    user_id: UUID;
    name: string;
    registered_at: string;
    edited_at: string;
}

export interface CreateBoxInput {
    name: string;
    pattern_id?: UUID | null;
}

export interface UpdateBoxInput extends CreateBoxInput { }

export interface GetBoxOutput {
    id: UUID;
    user_id: UUID;
    category_id: UUID;
    pattern_id: UUID | null;
    name: string;
    registered_at: string;
    edited_at: string;
}

export type TargetWeight = "heavy" | "normal" | "light" | "unset";

export interface CreatePatternStepField {
    step_number: number;
    interval_days: number;
}

export interface CreatePatternRequest {
    name: string;
    target_weight: TargetWeight;
    steps: CreatePatternStepField[];
}

export interface PatternStepResponse {
    pattern_step_id: UUID;
    user_id: UUID;
    pattern_id: UUID;
    step_number: number;
    interval_days: number;
}

export interface PatternResponse {
    id: UUID;
    user_id: UUID;
    name: string;
    target_weight: TargetWeight;
    registered_at: string;
    edited_at: string;
    steps: PatternStepResponse[];
}

export interface UpdatePatternStepField {
    step_id: UUID;
    step_number: number;
    interval_days: number;
}

export interface UpdatePatternRequest {
    name: string;
    target_weight: TargetWeight;
    steps: UpdatePatternStepField[];
}

export interface CreateItemRequest {
    category_id?: UUID | null;
    box_id?: UUID | null;
    pattern_id?: UUID | null;
    name: string;
    detail?: string | null;
    learned_date: string;
    is_mark_overdue_as_completed: boolean;
    today: string;
}

export interface UpdateItemRequest extends CreateItemRequest { }

export interface ReviewDateResponse {
    review_date_id: UUID;
    user_id: UUID;
    category_id: UUID | null;
    box_id: UUID | null;
    item_id: UUID;
    step_number: number;
    initial_scheduled_date: string;
    scheduled_date: string;
    is_completed: boolean;
}

export interface ItemResponse {
    item_id: UUID;
    user_id: UUID;
    category_id: UUID | null;
    box_id: UUID | null;
    pattern_id: UUID | null;
    name: string;
    detail: string | null;
    learned_date: string;
    is_finished: boolean;
    registered_at: string;
    edited_at: string;
    review_dates: ReviewDateResponse[];
}

export interface UpdateItemAsUnFinishedForceRequest {
    category_id?: UUID | null;
    box_id?: UUID | null;
    pattern_id: UUID;
    learned_date: string;
    today: string;
}

export interface UpdateReviewDateAsCompletedRequest {
    step_number: number;
}

export interface UpdateReviewDateAsInCompletedRequest {
    step_number: number;
}

export interface UpdateReviewDatesRequest {
    request_scheduled_date: string;
    is_mark_overdue_as_completed: boolean;
    today: string;
    pattern_id: UUID;
    learned_date: string;
    initial_scheduled_date: string;
    step_number: number;
    category_id?: UUID | null;
    box_id?: UUID | null;
}

export interface DailyReviewDate {
    review_date_id: UUID;
    item_id: UUID;
    category_id: UUID | null;
    box_id: UUID | null;
    step_number: number;
    initial_scheduled_date: string;
    prev_scheduled_date: string | null;
    scheduled_date: string;
    next_scheduled_date: string | null;
    is_completed: boolean;
    item_name: string;
    detail: string;
    learned_date: string;
    target_weight?: TargetWeight;
}

export interface DailyReviewBox {
    box_id: UUID;
    category_id: UUID;
    box_name: string;
    review_dates: DailyReviewDate[];
    target_weight: TargetWeight;
}

export interface UnclassifiedDailyReviewDate {
    review_date_id: UUID;
    item_id: UUID;
    category_id: UUID;
    step_number: number;
    initial_scheduled_date: string;
    prev_scheduled_date: string | null;
    scheduled_date: string;
    next_scheduled_date: string | null;
    is_completed: boolean;
    item_name: string;
    detail: string;
    learned_date: string;
}

export interface DailyReviewCategory {
    category_id: UUID;
    category_name: string;
    boxes: DailyReviewBox[];
    unclassified_daily_review_dates_by_category: UnclassifiedDailyReviewDate[];
}

export interface UnclassifiedUserDailyReview {
    review_date_id: UUID;
    item_id: UUID;
    step_number: number;
    initial_scheduled_date: string;
    prev_scheduled_date: string | null;
    scheduled_date: string;
    next_scheduled_date: string | null;
    is_completed: boolean;
    item_name: string;
    detail: string;
    learned_date: string;
}

export interface GetDailyReviewDatesResponse {
    categories: DailyReviewCategory[];
    daily_review_dates_grouped_by_user: UnclassifiedUserDailyReview[];
}

export interface ItemCountGroupedByBoxResponse {
    category_id: UUID;
    box_id: UUID;
    count: number;
}

export interface UnclassifiedItemCountGroupedByCategoryResponse {
    category_id: UUID;
    count: number;
}

export interface CountResponse {
    count: number;
}

export interface DailyCountGroupedByBoxResponse {
    category_id: UUID;
    box_id: UUID;
    count: number;
}

export interface UnclassifiedDailyDatesCountGroupedByCategoryResponse {
    category_id: UUID;
    count: number;
}
