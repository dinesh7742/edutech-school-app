
import type { DailySpecialOutput } from "@/ai/flows/get-daily-special";
type DailyEvent = DailySpecialOutput['events'][0];

export const specialDays: Record<string, DailyEvent[]> = {
  // Format is "MM-DD"
  "01-01": [{ eventName: "New Year's Day", description: "The first day of the Gregorian calendar.", type: "Other" }],
  "01-12": [{ eventName: "National Youth Day", description: "Commemorates the birthday of Swami Vivekananda.", type: "Anniversary" }],
  "01-14": [{ eventName: "Makar Sankranti / Pongal", description: "A Hindu harvest festival celebrated across India.", type: "Historical" }],
  "01-26": [{ eventName: "Republic Day", description: "Marks the date on which the Constitution of India came into effect.", type: "Historical" }],
  "01-30": [{ eventName: "Martyr's Day", description: "Commemorates the assassination of Mahatma Gandhi.", type: "Historical" }],
  "02-28": [{ eventName: "National Science Day", description: "Commemorates the discovery of the Raman effect by Sir C. V. Raman.", type: "Science" }],
  "03-08": [{ eventName: "International Women's Day", description: "A global day celebrating the social, economic, cultural, and political achievements of women.", type: "Other" }],
  "04-14": [{ eventName: "Ambedkar Jayanti", description: "Celebrates the birthday of Dr. B. R. Ambedkar, the architect of the Indian Constitution.", type: "Anniversary" }],
  "05-01": [{ eventName: "Labour Day", description: "Also known as May Day, it celebrates the achievements of workers.", type: "Historical" }],
  "08-15": [{ eventName: "Independence Day", description: "Commemorates India's independence from the United Kingdom.", type: "Historical" }],
  "08-29": [{ eventName: "National Sports Day", description: "Celebrates the birthday of hockey legend Dhyan Chand.", type: "Anniversary" }],
  "09-05": [{ eventName: "Teachers' Day", description: "Celebrates the birthday of Dr. Sarvepalli Radhakrishnan, a great teacher and former President of India.", type: "Anniversary" }],
  "09-14": [{ eventName: "Hindi Diwas", description: "Celebrates the adoption of Hindi as one of the official languages of India.", type: "Historical" }],
  "10-02": [{ eventName: "Gandhi Jayanti", description: "Celebrates the birthday of Mahatma Gandhi, the 'Father of the Nation'.", type: "Anniversary" }],
  "10-08": [{ eventName: "Indian Air Force Day", description: "Commemorates the establishment of the Indian Air Force.", type: "Historical" }],
  "10-31": [{ eventName: "National Unity Day", description: "Commemorates the birthday of Sardar Vallabhbhai Patel.", type: "Anniversary" }],
  "11-11": [{ eventName: "National Education Day", description: "Celebrates the birthday of Maulana Abul Kalam Azad, India's first Education Minister.", type: "Anniversary" }],
  "11-14": [{ eventName: "Children's Day", description: "Celebrates the birthday of Jawaharlal Nehru, India's first Prime Minister.", type: "Anniversary" }],
  "11-26": [{ eventName: "Constitution Day (Samvidhan Divas)", description: "Marks the day the Constituent Assembly of India adopted the Constitution.", type: "Historical" }],
  "12-04": [{ eventName: "Indian Navy Day", description: "Commemorates the Indian Navy's role in the Indo-Pakistani War of 1971.", type: "Historical" }],
  "12-16": [{ eventName: "Vijay Diwas", description: "Commemorates India's military victory over Pakistan in 1971.", type: "Historical" }],
  "12-22": [{ eventName: "National Mathematics Day", description: "Celebrates the birthday of the great mathematician Srinivasa Ramanujan.", type: "Science" }],
  "12-25": [{ eventName: "Christmas Day", description: "A Christian festival celebrating the birth of Jesus Christ.", type: "Other" }],
};

