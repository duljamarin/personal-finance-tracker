# Personal Finance Tracker

A modern finance tracker app built with React, Tailwind CSS, Vite, and **Supabase** as the backend.

## Features
- Authentication with Supabase Auth (email/password)
- Add, edit, delete transactions (supports both incomes and expenses)
- Dual monthly charts for incomes and expenses
- CSV export
- Responsive UI with dark mode
- Category management (add, edit, delete categories)
- Real-time data sync with Supabase PostgreSQL
- Row Level Security (RLS) for data protection

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Vite
- **Backend**: Supabase (PostgreSQL + Auth)
- **Hosting**: Netlify (Frontend)
- **Charts**: Recharts

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- A Supabase account ([supabase.com](https://supabase.com))

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd personal-finance-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Create a Supabase project:
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Note your project URL and anon/public API key

4. Set up environment variables:

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For Netlify deployment, add these environment variables in your Netlify site settings.

### Database Setup

Run the following SQL in your Supabase SQL Editor to create the required tables:

```sql
-- Create categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view their own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_categories_user_id ON categories(user_id);
```

### Supabase Authentication Setup

1. In your Supabase project dashboard, go to **Authentication > Settings**
2. For development, you can disable email confirmation:
   - Under **Email Auth**, toggle off "Confirm email"
3. Add your site URL to **Site URL** (e.g., `http://localhost:5173` for local dev, your Netlify URL for production)
4. Add your Netlify URL to **Redirect URLs** under **URL Configuration**

### Running Locally

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Deploying to Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Set the build command: `npm run build`
4. Set the publish directory: `dist`
5. Add environment variables in Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. The `public/_redirects` file is already configured for client-side routing

## Project Structure

```
src/
├── components/
│   ├── Auth/              # Login and Register forms
│   ├── Categories/        # Category management
│   ├── Transaction/       # Transaction form
│   ├── Transactions/      # Transaction list and charts
│   └── UI/                # Reusable UI components
├── context/
│   └── AuthContext.jsx    # Supabase auth context
├── hooks/
│   └── useDarkMode.js     # Dark mode hook
├── utils/
│   ├── api.js             # Supabase data access functions
│   ├── supabaseClient.js  # Supabase client initialization
│   └── csv.js             # CSV export utilities
└── App.jsx                # Main app component
```

## How It Works

### Authentication
- Uses Supabase Auth with email/password
- Session is automatically persisted across page reloads
- Username is stored in user metadata during registration

### Data Access
- All database operations use Supabase client
- Row Level Security ensures users can only access their own data
- Transactions include category information via foreign key relationship

### State Management
- React Context for authentication state
- Local state for UI and data management
- Real-time updates when data changes

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | `eyJhbGc...` |


