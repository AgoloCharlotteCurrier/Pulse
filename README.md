# Pulse - Trend Research Tool

A comprehensive trend research application that searches X/Twitter and Reddit for discussions on any topic and provides AI-powered synthesis of findings.

## Features

- **Multi-platform Search**: Search across X/Twitter and Reddit simultaneously
- **Flexible Time Ranges**: 2 days, 7 days, 14 days, 30 days, or custom ranges
- **AI Synthesis**: Powered by OpenAI GPT-4o-mini for intelligent analysis
- **Historical Tracking**: Store and browse past research runs
- **Clean UI**: Modern, minimal interface built with React and Tailwind CSS
- **Secure API Management**: Store API keys safely on the server side

## Architecture

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express.js + SQLite
- **AI**: OpenAI GPT-4o-mini for synthesis
- **APIs**: X/Twitter API v2, Reddit API, OpenAI API

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- API keys for the services you want to use:
  - X/Twitter Bearer Token (required for Twitter search)
  - Reddit Client ID & Secret (required for Reddit search)
  - OpenAI API Key (required for AI synthesis)

### Quick Start

1. **Clone and Install Dependencies**
   ```bash
   cd /path/to/pulse
   npm run install-all
   ```

2. **Environment Setup** (Optional - you can configure keys in the UI instead)
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```
   
   This will start:
   - Frontend dev server: http://localhost:5173
   - Backend API server: http://localhost:3001

### Getting API Keys

#### X/Twitter API
1. Visit [developer.twitter.com](https://developer.twitter.com)
2. Create a developer account and new app
3. Generate a Bearer Token from your app's "Keys and tokens" section
4. Use the Bearer Token in Pulse settings

#### Reddit API
1. Visit [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Click "Create App" or "Create Another App"
3. Choose "script" as the app type
4. Note down the client ID (under the app name) and client secret
5. Use both values in Pulse settings

#### OpenAI API
1. Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (you won't be able to see it again)
4. Use the key in Pulse settings

### Configuration

You can configure API keys in two ways:

1. **Through the UI** (Recommended)
   - Navigate to Settings page in the app
   - Enter your API keys
   - Keys are stored securely in SQLite database

2. **Environment Variables** (Fallback)
   - Copy `.env.example` to `.env`
   - Add your API keys to the `.env` file
   - These are used only if not configured in the UI

### Production Deployment

1. **Build the Frontend**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

The backend will serve the built frontend files in production mode.

## Usage

### Basic Search Flow

1. **Search**: Enter a topic and select time range
2. **Results**: View AI synthesis and raw posts
3. **History**: Browse past searches and results
4. **Settings**: Configure API keys

### Search Examples

- "knowledge management pain points"
- "competitor analysis feedback"
- "remote work productivity tools"
- "AI assistant user experience"

### AI Synthesis Output

The AI analysis provides:
- **Key Themes**: Main topics of discussion
- **Pain Points**: Common problems mentioned
- **Notable Quotes**: Interesting quotes from posts
- **Engagement Summary**: Metrics and sentiment analysis
- **Summary**: Overview of findings

## File Structure

```
pulse/
├── backend/                 # Express.js API server
│   ├── routes/             # API endpoints
│   │   ├── search.js       # Search functionality
│   │   ├── history.js      # Historical data
│   │   └── settings.js     # API key management
│   ├── database.js         # SQLite database setup
│   ├── server.js          # Main server file
│   └── package.json
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Main page components
│   │   ├── utils/         # API utilities
│   │   └── App.jsx        # Main app component
│   ├── package.json
│   └── vite.config.js
├── package.json           # Root package.json
├── .env.example          # Environment template
└── README.md            # This file
```

## API Endpoints

- `POST /api/search` - Perform trend search
- `GET /api/history` - Get search history
- `GET /api/history/:id` - Get specific search details
- `DELETE /api/history/:id` - Delete search run
- `GET /api/settings` - Get API key status
- `POST /api/settings` - Update API keys

## Database Schema

### search_runs
- `id`: Primary key
- `topic`: Search topic
- `time_range`: Selected time range
- `raw_results`: JSON of all posts
- `synthesis`: JSON of AI analysis
- `created_at`: Timestamp

### raw_posts
- `id`: Primary key
- `search_run_id`: Foreign key to search_runs
- `source`: 'twitter' or 'reddit'
- `title`, `content`, `author`, `date`
- `engagement_metrics`: JSON of likes/upvotes etc.
- `url`: Link to original post

### api_keys
- `id`: Primary key
- `key_name`: API key identifier
- `key_value`: Encrypted key value
- `created_at`, `updated_at`: Timestamps

## Development

### Available Scripts

- `npm run dev` - Start development servers (frontend + backend)
- `npm run client` - Start frontend only
- `npm run server` - Start backend only
- `npm run build` - Build frontend for production
- `npm start` - Start production server
- `npm run install-all` - Install all dependencies

### Tech Stack Details

- **React Router** for navigation
- **Heroicons** for UI icons
- **date-fns** for date formatting
- **axios** for API requests
- **sqlite3** for local database
- **OpenAI SDK** for AI integration

## Security

- API keys are stored securely in SQLite database
- Keys are masked in the UI for security
- Environment variables used as fallback only
- No hardcoded API keys in the codebase
- CORS properly configured for development

## Troubleshooting

### Common Issues

1. **Search returns no results**
   - Check API keys are configured correctly
   - Verify network connectivity
   - Try different search terms or time ranges

2. **AI synthesis fails**
   - Ensure OpenAI API key is valid and has credits
   - Check OpenAI service status

3. **Frontend won't connect to backend**
   - Ensure backend is running on port 3001
   - Check CORS configuration

### Logs

Backend logs are printed to console. Check for:
- Database connection status
- API request errors
- Search result counts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software for the Implicit team.