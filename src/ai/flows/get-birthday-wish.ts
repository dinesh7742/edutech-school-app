/**
 * @fileOverview A flow to generate a unique birthday wish for a student.
 */
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BirthdayWishInputSchema = z.object({
  studentName: z.string().describe('The first name of the student whose birthday it is.'),
});
export type BirthdayWishInput = z.infer<typeof BirthdayWishInputSchema>;

const BirthdayWishOutputSchema = z.object({
  wish: z.string().describe('A unique, creative, and heartfelt birthday wish. It should be 1-2 sentences long.'),
});
export type BirthdayWishOutput = z.infer<typeof BirthdayWishOutputSchema>;

export async function getBirthdayWish(input: BirthdayWishInput): Promise<BirthdayWishOutput> {
  return getBirthdayWishFlow(input);
}

const birthdayWishPrompt = ai.definePrompt({
  name: 'birthdayWishPrompt',
  input: { schema: BirthdayWishInputSchema },
  output: { schema: BirthdayWishOutputSchema },
  prompt: `
    You are a kind and creative school well-wisher.
    Generate a short, unique, and heartfelt birthday wish for a student named {{{studentName}}}.
    The wish should be encouraging and celebratory. Avoid generic phrases.
    Make it feel personal and special for a young student.
  `,
});

const getBirthdayWishFlow = ai.defineFlow(
  {
    name: 'getBirthdayWishFlow',
    inputSchema: BirthdayWishInputSchema,
    outputSchema: BirthdayWishOutputSchema,
  },
  async (input) => {
    const { output } = await birthdayWishPrompt(input);
    return output!;
  }
);
