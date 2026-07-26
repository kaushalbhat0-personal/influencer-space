import { z } from "zod/v4";

export const faqFormSchema = z.object({
  question: z.string().min(1, "Question is required").max(500),
  answer: z.string().min(1, "Answer is required").max(5000),
  category: z.string().optional(),
});

export type FAQFormValues = z.infer<typeof faqFormSchema>;
