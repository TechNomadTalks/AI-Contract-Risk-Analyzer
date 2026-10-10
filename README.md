# Contract Sentinel - AI Contract Risk Analyzer

An AI-powered contract analysis tool that extracts text from documents, identifies risky clauses, and provides risk assessments using local LLMs (Ollama) or rule-based analysis.

## Features

- **Multi-format Document Support**: PDF, DOCX, TXT, and image files (PNG, JPG, TIFF)
- **Text Extraction**: OCR via Tesseract.js for images, pdf-parse for PDFs, mammoth for DOCX
- **Clause Detection**: Automatically identifies 11 common contract clause types
- **Risk Assessment**: Scores clauses as High/Medium/Low risk based on keyword patterns
- **AI Analysis**: Uses local Ollama LLM for detailed clause analysis (fallback to rule-based)
- **Real-time Processing**: Visual progress tracking through upload, OCR, clause detection, and analysis stages
- **Local-First**: Runs entirely locally with no external API dependencies (except optional Ollama)

## Architecture

```
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main application page
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles with Tailwind v4
│   │   └── api/
│   │       ├── documents/upload  # File upload endpoint
│   │       ├── documents/[id]    # File retrieval endpoint
│   │       └── ollama/           # Ollama status & analysis endpoint
│   ├── components/
│   │   ├── UploadZone.tsx        # Drag-and-drop file upload
│   │   ├── DocumentCard.tsx      # Document list item
│   │   ├── AnalysisPanel.tsx     # Main analysis view (tabs: overview, clauses, full text)
│   │   ├── ClauseCard.tsx        # Expandable clause detail card
│   │   ├── RiskGauge.tsx         # Circular risk score visualization
│   │   └── Header.tsx            # Top navigation with Ollama status
│   ├── lib/
│   │   ├── text-extraction.ts    # Text extraction from various file types
│   │   ├── clause-detection.ts   # Regex-based clause identification & risk scoring
│   │   ├── ollama.ts             # Ollama integration & rule-based fallback
│   │   └── firebase.ts           # Firebase config (optional)
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
- **Ollama** (optional, for AI analysis): [Install Ollama](https://ollama.ai)

### Installation

```bash
# Clone the repository
git clone https://github.com/TechNomadTalks/AI-Contract-Risk-Analyzer.git
cd AI-Contract-Risk-Analyzer

# Install dependencies
npm install

# (Optional) Start Ollama for AI-powered analysis
ollama serve
ollama pull llama2  # or your preferred model

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file (optional):

```env
# Ollama configuration
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434

# Firebase (optional - for persistence)
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

## How It Works

### 1. Document Upload
- User drops or selects contract files (max 25MB)
- Files are uploaded to local `uploads/` directory via `/api/documents/upload`
- Document metadata stored in Zustand store with `uploading` status

### 2. Text Extraction
- File retrieved via `/api/documents/[id]`
- Based on file type:
  - **Images**: Tesseract.js OCR with progress callbacks
  - **PDFs**: pdf-parse library
  - **DOCX**: mammoth library
  - **TXT**: Direct text reading
- Text cleaned (normalize whitespace, remove control chars)

### 3. Clause Detection
- Regex patterns match clause headers/keywords in text
- 11 predefined clause types with specific patterns
- Extracted clause text (context around match)
- Risk level calculated from risk indicator keywords:
  - 2+ indicators → **High**
  - 1 indicator → **Medium**
  - 0 indicators → **Low**
- Overall risk score: weighted average (High=100, Medium=50, Low=20)

### 4. Risk Analysis
- **With Ollama**: Sends each clause to local LLM for detailed analysis
- **Without Ollama**: Rule-based fallback using predefined risk/recommendation mappings
- Aggregates all clause analyses into document-level summary

### 5. Results Display
- **Overview Tab**: Risk gauge, summary, key risks, recommendations, statistics
- **Clauses Tab**: Expandable cards with clause text, risk factors, AI analysis
- **Full Text Tab**: Raw extracted text for reference

## Scripts

```bash
npm run dev      # Start development server (Turbopack)
npm run build    # Build for production (uses webpack)
npm run start    # Start production server
npm run lint     # Run ESLint
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

## Limitations & Known Issues

1. **Local File Storage**: Files stored in `uploads/` directory (not persisted across deployments)
2. **No Authentication**: Single-user, no access control
3. **Ollama Required for AI**: Falls back to rule-based without local LLM
4. **Regex-based Detection**: May miss clauses with unusual formatting
5. **No Database**: Firebase configured but not actively used

## Future Improvements

- [ ] Add Firebase persistence for documents/analyses
- [ ] Implement user authentication
- [ ] Add clause comparison across documents
- [ ] Export analysis as PDF/report
- [ ] Support more file formats (RTF, ODT)
- [ ] Add custom clause pattern configuration
- [ ] Improve OCR accuracy with preprocessing
- [ ] Add unit/integration tests

## License

MIT