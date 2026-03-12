# Pair Programmers Dashboard

A premium, dark-themed dashboard for tracking pair programming sets.

## Features
- **Dynamic Data**: Fetches pairing information directly from a Google Sheets CSV.
- **Premium UI**: Modern dark theme with green accents, Inter typography, and micro-animations.
- **Lucide Icons**: Integrated icons for users, build status, and navigation.

## Setup

1. **Clone the repository**
2. **Configure Environment Variables**
   Create a `.env` file in the root directory and add your Google Sheets CSV URL:
   ```env
   VITE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv
   ```
3. **Install Dependencies**
   ```bash
   npm install
   ```
4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Tech Stack
- **Framework**: [Vue 3](https://vuejs.org/) (Composition API)
- **Build Tool**: [Vite](https://vite.dev/)
- **Data Parsing**: [PapaParse](https://www.papaparse.com/)
- **Icons**: [Lucide Vue Next](https://lucide.dev/)
- **Styling**: Vanilla CSS (Custom Design System)

## Data Source
The application expects a CSV published to the web with the following structure:

### CSV Template
```csv
full name,email,job title
"Doe, John",john.doe@example.com,Senior Developer
"Smith, Jane",jane.smith@example.com,Product Manager
"Brown, Charlie",charlie.brown@example.com,Junior Developer
"Davis, Alice",alice.davis@example.com,UX Designer
"Wilson, Bob",bob.wilson@example.com,QA Engineer
"Miller, Eve",eve.miller@example.com,DevOps Engineer
```

### Requirements
- **Headers**: Must include `full name`, `email`, and `job title`.
- **Pairing Logic**: Users are automatically paired sequentially (1st with 2nd, 3rd with 4th, etc.).
- **Formatting**: Handles both `"LastName, FirstName"` and `"FirstName LastName"` formats for the `full name` field.


## Discord Notifications

The project includes a scheduled notification system that sends today's pairings to a Discord channel every workday at 7:00 AM (UTC+8).

### GitHub Configuration

To enable automated notifications, you must configure **Secrets** and **Variables** in your GitHub repository:

1.  Navigate to your repository on GitHub.
2.  Go to **Settings** > **Secrets and variables** (bottom of left sidebar) > **Actions**.

#### 1. Secrets Tab
Click **New repository secret** for the following:
- `DISCORD_WEBHOOK_URL`: Your Discord channel webhook URL.
- `VITE_SHEET_CSV_URL`: Your Google Sheet CSV URL (required for the script to fetch data).

#### 2. Variables Tab
Click **New repository variable** for the following:
- `VITE_APP_URL`: The URL where your dashboard is hosted (e.g., `https://pairprogrammers.example.com`).
- `VITE_APP_TITLE`: (Optional) Custom title for the Discord bot.
- `VITE_START_SET_NUMBER`: (Optional) The starting set number (defaults to `640`).

### Local Testing

You can test the notification script locally using your terminal.

#### Using Bash (Linux/macOS/Git Bash)
```bash
DISCORD_WEBHOOK_URL="your_webhook_url" \
VITE_SHEET_CSV_URL="your_csv_url" \
VITE_APP_URL="your_app_url" \
node scripts/discord-notify.js
```

#### Using PowerShell (Windows)
```powershell
$env:DISCORD_WEBHOOK_URL="your_webhook_url"
$env:VITE_SHEET_CSV_URL="your_csv_url"
$env:VITE_APP_URL="your_app_url"
node scripts/discord-notify.js
```

---

> [!IMPORTANT]
> Ensure your Google Sheet is **Published to the Web** as a **CSV** for the application to access the data.
