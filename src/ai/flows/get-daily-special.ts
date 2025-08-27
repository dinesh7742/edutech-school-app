
/**
 * @fileOverview A flow to get a list of special events for a given day.
 */
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DailySpecialInputSchema = z.object({
  date: z.string().describe('The date to get the special event for, in YYYY-MM-DD format.'),
});
export type DailySpecialInput = z.infer<typeof DailySpecialInputSchema>;

const DailySpecialEventSchema = z.object({
  eventName: z.string().describe('A short, catchy name for the event.'),
  description: z.string().describe('A one or two sentence, engaging description of the event.'),
  type: z.enum(['Historical', 'Science', 'Arts', 'Anniversary', 'Other']).describe('The category of the event.'),
});

const DailySpecialOutputSchema = z.object({
    events: z.array(DailySpecialEventSchema).describe("An array of up to 5 significant events for the given date.")
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
    You are a fascinating almanac. For the given date, {{{date}}}, find up to 5 interesting and significant events that occurred on that day in history.
    
    Strongly prioritize events, discoveries, and anniversaries related to India. If significant Indian events are available for the date, please choose those. Otherwise, you can select globally relevant events.
    
    Focus on globally relevant events, scientific discoveries, famous birthdays or death anniversaries, or major cultural moments.
    Avoid obscure or trivial events. The events should be something a student would find interesting.

    For each event, provide a short, catchy eventName.
    The description should be concise and engaging, limited to one or two sentences.
    Categorize each event into one of the following types: Historical, Science, Arts, Anniversary, Other.

    Return the list of events in the 'events' array.
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
