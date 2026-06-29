export interface OccasionItem {
    name: string;
    label: string;
    emoji: string;
}

const PERMANENT_POOL: OccasionItem[] = [
    { name: "Birthday", label: "Birthday", emoji: "🎂" },
    { name: "Anniversary", label: "Anniversary", emoji: "❤️" },
    { name: "Wedding", label: "Wedding", emoji: "💍" },
    { name: "Housewarming", label: "Housewarming", emoji: "🏠" },
    { name: "Graduation", label: "Graduation", emoji: "🎓" },
    { name: "Baby Shower", label: "Baby Shower", emoji: "👶" },
    { name: "New Job", label: "New Job", emoji: "💼" },
    { name: "Retirement", label: "Retirement", emoji: "⏳" },
    { name: "Get Well Soon", label: "Get Well Soon", emoji: "🤒" },
    { name: "Thank You", label: "Thank You", emoji: "🙏" },
    { name: "Congratulations", label: "Congratulations", emoji: "🎉" },
    { name: "Apology", label: "Apology", emoji: "😔" },
    { name: "Romantic Surprise", label: "Romantic Surprise", emoji: "🌹" },
    { name: "Mother's Day", label: "Mother's Day", emoji: "👩" },
    { name: "Father's Day", label: "Father's Day", emoji: "👨" }
];

// Fallbacks used when seasonal events are sparse
const FALLBACK_POOL: OccasionItem[] = [
    { name: "Thank You", label: "Thank You", emoji: "🙏" },
    { name: "Congratulations", label: "Congratulations", emoji: "🎉" },
    { name: "New Job", label: "New Job", emoji: "💼" },
    { name: "Housewarming", label: "Housewarming", emoji: "🏠" },
    { name: "Get Well Soon", label: "Get Well Soon", emoji: "🤒" }
];

interface SeasonalEvent {
    name: string;
    label: string;
    emoji: string;
    month: number; // 1-indexed
    day: number;
}

const SEASONAL_POOL: SeasonalEvent[] = [
    { name: "Sinhala & Tamil New Year", label: "Avurudu", emoji: "🌸", month: 4, day: 14 },
    { name: "Vesak", label: "Vesak", emoji: "🏮", month: 5, day: 15 },
    { name: "Poson", label: "Poson", emoji: "🕯️", month: 6, day: 15 },
    { name: "Christmas", label: "Christmas", emoji: "🎄", month: 12, day: 25 },
    { name: "New Year", label: "New Year", emoji: "🎆", month: 1, day: 1 },
    { name: "Valentine's Day", label: "Valentine's Day", emoji: "💖", month: 2, day: 14 },
    { name: "Ramadan / Eid", label: "Ramadan / Eid", emoji: "🌙", month: 3, day: 20 },
    { name: "Deepavali", label: "Deepavali", emoji: "🪔", month: 11, day: 8 },
    { name: "Teachers Day", label: "Teachers Day", emoji: "🍎", month: 10, day: 6 },
    { name: "Children's Day", label: "Children's Day", emoji: "🎈", month: 10, day: 1 }
];

export class OccasionEngine {
    public static getActiveOccasions(currentDate: Date = new Date()): OccasionItem[] {
        const curYear = currentDate.getFullYear();
        
        // 1. Calculate scores for seasonal events
        const seasonalWithScores = SEASONAL_POOL.map(event => {
            let targetDate = new Date(curYear, event.month - 1, event.day);
            
            // If the event has passed by more than 5 days, calculate for the next year
            if (currentDate.getTime() - targetDate.getTime() > 5 * 24 * 60 * 60 * 1000) {
                targetDate = new Date(curYear + 1, event.month - 1, event.day);
            }
            
            const timeDiff = targetDate.getTime() - currentDate.getTime();
            const daysDiff = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));
            
            let priority = 0; // 0 = not within 45 days, 1 = within 45 days, 2 = within 15 days
            let score = 0;
            
            if (daysDiff >= 0 && daysDiff <= 15) {
                priority = 2;
                score = 1000 + (15 - daysDiff); // Higher score for closer events
            } else if (daysDiff > 15 && daysDiff <= 45) {
                priority = 1;
                score = 500 + (45 - daysDiff);
            } else {
                priority = 0;
                score = 365 - Math.abs(daysDiff); // Default sorting by distance
            }
            
            return {
                event,
                daysDiff,
                priority,
                score
            };
        });

        // Sort seasonal events: priority first, then closest
        seasonalWithScores.sort((a, b) => b.score - a.score);
        
        // Filter out actual active seasonal events (priority > 0)
        const activeSeasonals = seasonalWithScores
            .filter(s => s.priority > 0)
            .map(s => ({
                name: s.event.name,
                label: s.event.label,
                emoji: s.event.emoji
            }));

        // Limit active seasonal events to max 6
        let selectedSeasonals = activeSeasonals.slice(0, 6);

        // 2. Select 6 permanent events
        // Default permanent options (familiar and common)
        const defaultPermanents = ["Birthday", "Anniversary", "Wedding", "Graduation", "Baby Shower", "Housewarming"];
        const selectedPermanents: OccasionItem[] = [];
        
        // Map names to actual pool items
        defaultPermanents.forEach(name => {
            const item = PERMANENT_POOL.find(p => p.name === name);
            if (item) selectedPermanents.push(item);
        });

        // 3. Fallback Occasions Pad
        // We need 6 seasonal events. If we have less, we pad using FALLBACK_POOL.
        if (selectedSeasonals.length < 6) {
            const needed = 6 - selectedSeasonals.length;
            let padCount = 0;
            
            for (const fallback of FALLBACK_POOL) {
                // Ensure we don't duplicate a permanent event or a seasonal event
                const alreadySelected = selectedPermanents.some(p => p.name === fallback.name) ||
                                        selectedSeasonals.some(s => s.name === fallback.name);
                if (!alreadySelected) {
                    selectedSeasonals.push(fallback);
                    padCount++;
                    if (padCount >= needed) break;
                }
            }
        }

        // Return combined list (6 permanent + 6 seasonal/fallback = 12 items)
        return [...selectedPermanents, ...selectedSeasonals];
    }
}
