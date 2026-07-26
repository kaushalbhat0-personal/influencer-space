export interface CourseData {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  moduleCount: number;
  lessonCount: number;
  createdAt: Date;
}

export interface ModuleData {
  id: string;
  courseId: string;
  title: string;
  order: number;
  lessonCount: number;
}

export interface LessonData {
  id: string;
  moduleId: string;
  title: string;
  order: number;
  status: "DRAFT" | "PUBLISHED";
  duration: number | null;
}

export interface CourseFormInput {
  title: string;
  description?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}
