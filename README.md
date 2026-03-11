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
