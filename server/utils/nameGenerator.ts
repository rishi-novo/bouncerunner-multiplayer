
const ADJECTIVES = [
    "Neon", "Quantum", "Rapid", "Silent", "Crimson",
    "Turbo", "Ghost", "Hyper", "Violet", "Azure",
    "Cosmic", "Solar", "Lunar", "Stellar", "Sonic"
];

const NOUNS = [
    "Runner", "Falcon", "Byte", "Phantom", "Vector",
    "Blaze", "Circuit", "Nova", "Rider", "Shadow",
    "Surfer", "Pilot", "Drifter", "Glider", "Dasher"
];

export function generateRandomUsername(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 900 + 100); // 100-999
    return `${adj}${noun}${num}`;
}
