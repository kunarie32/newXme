import Levenshtein from 'fast-levenshtein';

// ===== BADWORD LIST =====
const BADWORDS = [
    // Bahasa Indonesia
    "kontol", "memek", "babi", "anjing", "bangsat", "ngentot", "titit", "pepek", "kondom",
    "pelacur", "lonte", "bokep", "jembut", "kemaluan", "masturbasi", "coli", "sange", "bugil",
    "ngentod", "ngentot", "kimak", "pantat", "bencong", "banci", "tolol", "goblok", "idiot",
    "tai", "sinting", "setan", "perek", "brengsek", "kampret", "sialan", "bangke", "keparat",
    "anjir", "ajg", "bgsat", "memk", "ngntt", "bgst", "ngntl", "cukimak", "bajingan", "pantek",

    // Bahasa Inggris
    "fuck", "shit", "asshole", "bitch", "bastard", "cunt", "dick", "pussy", "fucker",
    "slut", "whore", "motherfucker", "bullshit", "nigger", "nigga", "faggot", "gayass",
    "retard", "idiot", "dildo", "cock", "jerk", "wank", "arse", "tits", "porn", "boobs",
    "masturbate", "suck", "sucker", "damn", "hell", "fuckface", "shitface", "dumbass",
    "fap", "orgasm", "ejaculate", "cum", "sex", "xxx", "nude", "nsfw"
];

// ===== LEET MAP =====
const LEET_MAP: { [key: string]: string } = {
    '4': 'a', '3': 'e', '1': 'i', '0': 'o', '5': 's', '7': 't',
    '@': 'a', '$': 's', '!': 'i', '|': 'l'
};

/**
 * Normalize leetspeak characters to regular characters
 */
function normalizeLeetspeak(text: string): string {
    return text.toLowerCase().split('').map(char => LEET_MAP[char] || char).join('');
}

/**
 * Check if text matches any badword using fuzzy matching
 */
function fuzzyBadwordMatch(text: string, badwords: string[], threshold: number = 0.8): boolean {
    for (let i = 0; i < badwords.length; i++) {
        const word = badwords[i];
        if (!word) continue; // Skip if word is undefined
        const distance = Levenshtein.get(text, word);
        const maxLength = Math.max(text.length, word.length);
        const similarity = 1 - (distance / maxLength);
        
        if (similarity >= threshold) {
            return true;
        }
    }
    return false;
}

/**
 * Advanced badword detection with leetspeak normalization and fuzzy matching
 */
function isBadwordAdvanced(username: string, badwords: string[] = BADWORDS): boolean {
    // Clean the username: remove non-alphanumeric characters except @!$
    const cleaned = username.toLowerCase().replace(/[^a-z0-9@!$]/g, '');
    
    // Normalize leetspeak
    const normalized = normalizeLeetspeak(cleaned);
    
    // Check the entire normalized string - but only if it's long enough to be meaningful
    if (normalized.length >= 4 && (badwords.includes(normalized) || fuzzyBadwordMatch(normalized, badwords))) {
        return true;
    }
    
    // Sliding window approach - check substrings
    for (let i = 0; i < normalized.length; i++) {
        for (let j = i + 1; j <= Math.min(normalized.length, i + 10); j++) {
            const substr = normalized.substring(i, j);
            if (substr.length >= 4) { // Only check substrings of length 4 or more to avoid false positives
                if (badwords.includes(substr) || fuzzyBadwordMatch(substr, badwords, 0.85)) { // Increase threshold to reduce false positives
                    return true;
                }
            }
        }
    }
    
    return false;
}

/**
 * Validate username against badwords
 */
export function validateUsername(username: string): { isValid: boolean; reason?: string } {
    if (!username || typeof username !== 'string') {
        return { isValid: false, reason: 'Username is required' };
    }
    
    if (isBadwordAdvanced(username)) {
        return { isValid: false, reason: 'Username contains inappropriate content' };
    }
    
    return { isValid: true };
}

/**
 * Check if a string contains badwords (for general text validation)
 */
export function containsBadwords(text: string): boolean {
    return isBadwordAdvanced(text);
}

/**
 * Get a cleaned version of text with badwords replaced
 */
export function cleanText(text: string, replacement: string = '***'): string {
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    let cleaned = text;
    const words = text.split(/\s+/);
    
    for (const word of words) {
        if (isBadwordAdvanced(word)) {
            cleaned = cleaned.replace(new RegExp(word, 'gi'), replacement);
        }
    }
    
    return cleaned;
}

export default {
    validateUsername,
    containsBadwords,
    cleanText
};