/**
 * @fileOverview A flow to get a special event for a given day.
 */
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const DailySpecialInputSchema = z.object({
  date: z.string().describe('The date to get the special event for, in YYYY-MM-DD format.'),
});
export type DailySpecialInput = z.infer<typeof DailySpecialInputSchema>;

export const DailySpecialOutputSchema = z.object({
  eventName: z.string().describe('A short, catchy name for the event.'),
  description: z.string().describe('A one or two sentence, engaging description of the event.'),
  type: z.enum(['Historical', 'Science', 'Arts', 'Anniversary', 'Other']).describe('The category of the event.'),
});
export type DailySpecialOutput = z.infer<typeof DailySpecialOutputSchema>;

export async function getDailySpecial(input: DailySpecialInput): Promise<DailySpecialOutput> {
  return getDailySpecialFlow(input);
}

const dailySpecialPrompt = ai.definePrompt({
  name: 'dailySpecialPrompt',
  input: { schema: DailySpecialInputSchema },
  output: { schema: DailySpecialOutputSchema },
  prompt: `
    You are a fascinating almanac. For the given date, {{{date}}}, find one interesting and significant event that occurred on that day in history.
    Focus on globally relevant events, scientific discoveries, famous birthdays or death anniversaries, or major cultural moments.
    Avoid obscure or trivial events. The event should be something a student would find interesting.

    Provide a short, catchy eventName for the event.
    The description should be concise and engaging, limited to one or two sentences.
    Categorize the event into one of the following types: Historical, Science, Arts, Anniversary, Other.
  `,
});

const getDailySpecialFlow = ai.defineFlow(
  {
    name: 'getDailySpecialFlow',
    inputSchema: DailySpecialInputSchema,
    outputSchema: DailySpecialOutputSchema,
  },
  async (input) => {
    const { output } = await dailySpecialPrompt(input);
    return output!;
  }
);
