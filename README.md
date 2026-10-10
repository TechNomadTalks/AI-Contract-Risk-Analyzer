# Contract Sentinel - AI Contract Risk Analyzer

An AI-powered contract analysis tool that extracts text from documents, identifies risky clauses, and provides risk assessments using local LLMs (Ollama) or custom AI APIs, with rule-based fallback.

## Features

- **Multi-format Document Support**: PDF, DOCX, TXT, and image files (PNG, JPG, TIFF)
- **Text Extraction**: OCR via Tesseract.js for images, pdf-parse for PDFs, mammoth for DOCX
- **Clause Detection**: Automatically identifies 11 common contract clause types
- **Risk Assessment**: Scores clauses as High/Medium/Low risk based on keyword patterns
- **AI Analysis**: Uses local Ollama LLM (8B-12B models) or custom OpenAI-compatible API
- **Skill Tree System**: Configurable analysis skills with custom prompts
- **Real-time Processing**: Visual progress tracking through upload, OCR, clause detection, and analysis stages
- **Local-First**: Runs entirely locally with optional Firebase persistence
- **Firebase Persistence**: Documents, analyses, and settings stored in Firestore
- **Authentication**: Firebase Auth with development fallback

## Architecture

```
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main application page
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles with Tailwind v4
│   │   └── api/
│   │       ├── documents/upload  # File upload endpoint (25MB limit, MIME validation)
│   │       ├── documents/[id]    # File retrieval endpoint (path traversal protected)
│   │       ├── ollama/           # Ollama status & analysis endpoint
│   │       └── settings/         # Settings & skill tree persistence
│   ├── components/
│   │   ├── UploadZone.tsx        # Drag-and-drop file upload
│   │   ├── DocumentCard.tsx      # Document list item
│   │   ├── AnalysisPanel.tsx     # Main analysis view (tabs: overview, clauses, full text)
│   │   ├── ClauseCard.tsx        # Expandable clause detail card
│   │   ├── RiskGauge.tsx         # Circular risk score visualization
│   │   ├── Header.tsx            # Top navigation with Ollama status
│   │   └── SettingsModal.tsx     # Settings UI (Ollama, Custom API, Skill Tree tabs)
│   ├── context/
│   │   └── SettingsContext.tsx   # React Context for settings state
│   ├── lib/
│   │   ├── text-extraction.ts    # Text extraction from various file types
│   │   ├── clause-detection.ts   # Regex-based clause identification & risk scoring
│   │   ├── ollama.ts             # Ollama integration, custom API, rule-based fallback
│   │   ├── database.ts           # Firestore CRUD with transactions
│   │   ├── firebase.ts           # Firebase client config
│   │   ├── auth.ts               # Firebase Admin auth verification
│   │   ├── risk-config.ts        # Shared clause risk configuration
│   │   └── server/
│   │       └── custom-api.ts     # Server-side custom API handler
│   ├── store/
│   │   └── index.ts              # Zustand state management
│   └── types/
│       └── index.ts              # TypeScript interfaces
```

## Supported Clause Types

| Type | Title | Risk Indicators |
|------|-------|-----------------|
| `termination` | Termination | without cause, immediate termination, unilateral termination, no notice, at will |
| `liability` | Liability | unlimited liability, no limit, sole liability, aggregate limit, waive, forever |
| `payment` | Payment Terms | net 90, net 120, late fee, interest on late, accelerate, prepayment |
| `confidentiality` | Confidentiality | perpetual, indefinite, worldwide, irrevocable, unlimited |
| `intellectual_property` | Intellectual Property | exclusive, irrevocable, perpetual license, worldwide, transfer all rights |
| `force_majeure` | Force Majeure | pandemic, epidemic, government action, war, terrorism |
| `governing_law` | Governing Law | exclusive jurisdiction, mandatory arbitration, foreign law, out of state |
| `warranty` | Warranty | no warranty, as is, disclaim all, no merchantability, exclude warranty |
| `assignment` | Assignment | without consent, freely assign, unilateral assignment |
| `amendments` | Amendments | unilateral amendment, no notice, oral modification, written only |

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- **Ollama** (optional, for local AI analysis): [Install Ollama](https://ollama.ai)
- **Firebase Project** (optional, for persistence): [Create Firebase Project](https://console.firebase.google.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/TechNomadTalks/AI-Contract-Risk-Analyzer.git
cd AI-Contract-Risk-Analyzer

# Install dependencies
npm install

# (Optional) Start Ollama for local AI-powered analysis
ollama serve
ollama pull llama3.1:8b  # Recommended 8B-12B models: llama3.1:8b, llama3.1:12b, mistral:12b, qwen2.5:12b

# (Optional) Configure Firebase for persistence
# 1. Create Firebase project at console.firebase.google.com
# 2. Enable Firestore and Authentication
# 3. Generate service account key for Admin SDK
# 4. Add environment variables (see below)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file:

```env
# Ollama configuration
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434

# Firebase Client (for frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (for backend auth - required for authentication)
FIREBASE_ADMIN_PROJECT_ID=your-project
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Note**: Without Firebase Admin credentials, the app runs in development mode with a default dev user. For production, configure the Admin SDK.

## How It Works

### 1. Document Upload
- User drops or selects contract files (max 25MB)
- **Security**: File type validated via MIME detection (`file-type` library), not just extension
- Files uploaded to local `uploads/` directory via `/api/documents/upload`
- Document metadata stored in Zustand store and Firestore

### 2. Text Extraction
- File retrieved via `/api/documents/[id]` (path traversal protected)
- Based on file type:
  - **Images**: Tesseract.js OCR with progress callbacks (120s timeout)
  - **PDFs**: pdf-parse library with PDF.js worker
  - **DOCX**: mammoth library
  - **TXT**: Direct text reading
- Text cleaned (normalize whitespace, remove control chars)

### 3. Clause Detection
- Regex patterns match clause headers/keywords in text
- 11 predefined clause types with specific patterns (from shared `risk-config.ts`)
- Extracted clause text using sentence-boundary context (500 chars)
- Overlap prevention with 50-char buffer and range merging
- Risk level calculated from risk indicator keywords:
  - 2+ indicators → **High**
  - 1 indicator → **Medium**
  - 0 indicators → **Low**
- Overall risk score: weighted average (High=100, Medium=50, Low=20)

### 4. Risk Analysis
- **Custom API**: If configured, uses OpenAI-compatible endpoint (server-side only)
- **Ollama**: Sends each clause to local LLM with skill-tree-built prompts
- **Rule-based Fallback**: Predefined risk/recommendation mappings per clause type
- **Validation**: Zod schema validates AI JSON responses
- **Retry Logic**: Exponential backoff (3 retries, 1s→2s→4s) for AI calls
- **Parallel Processing**: Clauses analyzed concurrently with `Promise.allSettled`
- Aggregates all clause analyses into document-level summary

### 5. Skill Tree System
- Hierarchical skills with enable/disable toggles
- 4 built-in skills: Risk Identification, Compliance Check, Negotiation Points, Executive Summary
- Custom prompts per skill, editable in Settings modal
- Cycle detection prevents infinite recursion
- Prompt sanitization prevents injection

### 6. Results Display
- **Overview Tab**: Risk gauge, summary, key risks, recommendations, statistics
- **Clauses Tab**: Expandable cards with clause text, risk factors, AI analysis
- **Full Text Tab**: Raw extracted text for reference

## Scripts

```bash
npm run dev      # Start development server (Turbopack)
npm run build    # Build for production (uses webpack)
npm run start    # Start production server
npm run lint     # Run ESLint
npx jest         # Run unit tests
```

## Configuration

### Next.js Config (`next.config.ts`)
- TypeScript errors ignored during build
- Webpack fallback for Node.js modules (fs, net, tls)
- Turbopack enabled with empty config
- Output file tracing root set to prevent workspace warnings

### Tailwind v4
- Uses `@tailwindcss/postcss` plugin
- Custom CSS variables for theming
- Noise overlay background effect

### Recommended Ollama Models (8B-12B)
- `llama3.1:8b` (default) - Best balance of quality/speed
- `llama3.1:12b` - Higher quality, slower
- `mistral:12b` - Strong reasoning
- `qwen2.5:12b` - Multilingual support
- `phi3:14b` - Microsoft's compact model
- `gemma2:9b` / `gemma2:12b` - Google's models

## Resolved Limitations (Previously Known Issues)

| Issue | Resolution |
|-------|------------|
| Local File Storage | Firebase Firestore persistence for documents/analyses |
| No Authentication | Firebase Auth with Admin SDK verification (dev fallback) |
| Ollama Required for AI | Custom OpenAI-compatible API support; rule-based fallback |
| Regex-based Detection | Improved with sentence boundaries, shared config, tests |
| No Database | Full Firestore integration with transactions |
| No Input Validation | 25MB limit, MIME type validation, path traversal protection |
| No Retry Logic | Exponential backoff for AI API calls |
| No JSON Validation | Zod schema for AI responses |
| No File Cleanup | DELETE endpoint for failed processing cleanup |
| Skill Tree Rigidity | Full hierarchical skill tree with custom prompts |
| No Pagination | `limit`/`startAfter` params in document queries |
| No Tests | 22 unit tests for clause detection |

## Remaining Limitations

1. **Local File Storage**: Uploaded files in `uploads/` directory (not persisted across deployments)
2. **OCR Accuracy**: Tesseract.js baseline; could improve with preprocessing
3. **Clause Detection**: Regex-based; may miss unusually formatted clauses
4. **Single-page App**: No server-side rendering for SEO
5. **No Export**: Analysis results not exportable as PDF/report
6. **Limited Formats**: RTF, ODT not supported

## Future Improvements

- [ ] Add file storage to Firebase Storage / S3
- [ ] Clause comparison across documents
- [ ] Export analysis as PDF/report
- [ ] Support more file formats (RTF, ODT)
- [ ] Improve OCR accuracy with image preprocessing
- [ ] Add integration tests for API endpoints
- [ ] Add clause highlighting in full text view
- [ ] Multi-language contract support
- [ ] Real-time collaboration features

## Testing

```bash
# Run unit tests
npx jest

# Run with coverage
npx jest --coverage
```

**Current Coverage**: 22 tests for clause detection (detectClauses, calculateRiskLevel, calculateOverallRiskScore, getClauseTitle)

## License

MIT