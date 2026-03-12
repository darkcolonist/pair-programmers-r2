import Papa from 'papaparse';
import md5 from 'md5';

// Configuration from environment variables
const SHEET_URL = process.env.VITE_SHEET_CSV_URL;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const APP_URL = process.env.VITE_APP_URL || 'https://darkcolonist.github.io/pair-programmers-r2/';
const START_SET_NUMBER = parseInt(process.env.VITE_START_SET_NUMBER || '640');
const PLACEHOLDER_NAME = process.env.VITE_PLACEHOLDER_NAME || '-';
const PLACEHOLDER_EMAIL = process.env.VITE_PLACEHOLDER_EMAIL || null;
const APP_TITLE = process.env.VITE_APP_TITLE || 'Pair Programmers';

// Constants for rotation logic
const START_DATE = new Date(2026, 2, 11); // March 11, 2026

const getGravatarUrl = (email, size = 120) => {
    if (!email) return null;
    const hash = md5(email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?d=robohash&s=${size}`;
};

const formatFirstName = (fullName) => {
    if (!fullName) return 'Unknown';
    if (fullName.includes(',')) {
        return fullName.split(',')[1].trim().split(' ')[0];
    }
    return fullName.split(' ')[0];
};

const calculateCurrentSet = () => {
    const now = new Date();
    // Use local date at midnight to match Vue component logic
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = targetDate - START_DATE;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return START_SET_NUMBER + diffDays;
};

const getPairingsForSet = (users, setNum) => {
    const nOrig = users.length;
    let usersToPair = [...users];
    
    if (nOrig % 2 !== 0) {
        usersToPair.push({
            'full name': PLACEHOLDER_NAME,
            email: PLACEHOLDER_EMAIL
        });
    }

    const n = usersToPair.length;
    const offset = setNum - START_SET_NUMBER;

    let rotationPath = [];
    if (n === 6) {
        rotationPath = [0, 1, 3, 5, 4, 2];
    } else {
        rotationPath.push(0);
        for (let i = 1; i < n; i += 2) rotationPath.push(i);
        for (let i = (n % 2 === 0 ? n - 2 : n - 1); i >= 2; i -= 2) rotationPath.push(i);
    }

    const rotated = new Array(n);
    for (let i = 0; i < rotationPath.length; i++) {
        const targetIdx = rotationPath[i];
        const fromIdxInPath = ((i - offset) % rotationPath.length + rotationPath.length) % rotationPath.length;
        rotated[targetIdx] = usersToPair[rotationPath[fromIdxInPath]];
    }

    const pairs = [];
    for (let i = 0; i < rotated.length; i += 2) {
        pairs.push({
            user1: rotated[i],
            user2: rotated[i + 1]
        });
    }
    return pairs;
};

async function run() {
    console.log('--- Starting Discord Pairing Notification ---');
    
    if (!SHEET_URL) {
        console.error('Error: VITE_SHEET_CSV_URL is not set.');
        process.exit(1);
    }
    if (!DISCORD_WEBHOOK_URL) {
        console.error('Error: DISCORD_WEBHOOK_URL is not set.');
        process.exit(1);
    }

    try {
        console.log('Fetching CSV data...');
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error('Failed to fetch CSV data');
        const csvData = await response.text();

        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const users = results.data;
                if (!users || users.length === 0) {
                    console.error('Error: No users found in CSV.');
                    process.exit(1);
                }

                const currentSetNum = calculateCurrentSet();
                const pairings = getPairingsForSet(users, currentSetNum);

                console.log(`Calculated pairings for Set ${currentSetNum}`);

                const now = new Date();
                const todayFormatted = now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const timeStr = "7:00am"; // As requested in the format

                // Helper to center text in a field
                const centerText = (text, width) => {
                    const pad = width - text.length;
                    if (pad <= 0) return text.substring(0, width);
                    const left = Math.floor(pad / 2);
                    const right = pad - left;
                    return ' '.repeat(left) + text + ' '.repeat(right);
                };

                const col1Width = 15;
                const col2Width = 14;
                const separator = `+${'-'.repeat(col1Width)}+${'-'.repeat(col2Width)}+`;
                const emptyRow = `|${' '.repeat(col1Width)}|${' '.repeat(col2Width)}|`;

                let table = `🚀 **Good morning!** Here are today's pair programmers for **Set ${currentSetNum}** (**${todayFormatted} ${timeStr}**).\n\n`;
                table += `\`\`\`\n`;
                table += separator + '\n';
                
                pairings.forEach(pair => {
                    const name1 = formatFirstName(pair.user1['full name']);
                    const name2 = formatFirstName(pair.user2['full name']);
                    table += emptyRow + '\n';
                    table += `|${centerText(name1, col1Width)}|${centerText(name2, col2Width)}|\n`;
                    table += emptyRow + '\n';
                    table += separator + '\n';
                });
                table += `\`\`\`\nView Dashboard: ${APP_URL}`;

                const discordPayload = {
                    username: APP_TITLE,
                    avatar_url: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/users.png',
                    content: table
                };

                console.log('Sending to Discord...');
                const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(discordPayload)
                });

                if (discordResponse.ok) {
                    console.log('Notification sent successfully!');
                } else {
                    const errorMsg = await discordResponse.text();
                    console.error('Error sending to Discord:', discordResponse.status, errorMsg);
                    process.exit(1);
                }
            }
        });

    } catch (error) {
        console.error('Execution failed:', error);
        process.exit(1);
    }
}

run();
