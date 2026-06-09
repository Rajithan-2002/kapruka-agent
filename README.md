# Kapruka AI Assistant - Kappy

This repository contains the visual prototype UI and test scripts for **Kappy**, the AI shopping assistant for Kapruka.

## Repository Structure

The workspace is organized as follows:

```text
kapruka-ai/
├── frontend/             # Next.js, Tailwind v4, TypeScript Chat UI
│   ├── src/              # React components & API routes
│   ├── public/           # Product assets & images
│   └── ...
│
├── backend/              # MCP scripts, search clients, & API test files
│   ├── api-test.js
│   ├── mcp-test.js
│   ├── search-test.js
│   └── ...
│
├── documentations/       # System specifications & visual architecture guides
│   ├── UI Component Specifications.docx
│   ├── UX System, Visual Design & Interface Architecture.docx
│   └── ...
```

---

## 🚀 Getting Started

### 1. Frontend Development Server
To launch and run the visual Chat UI:

```bash
# Navigate to the frontend directory
cd frontend

# Start the Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the network IP shown in your console) to view the Kappy interface.

### 2. Backend & MCP Test Scripts
To test command line integrations with the Kapruka MCP server:

```bash
# Navigate to the backend directory
cd backend

# Run the search test script
node search-test.js "flowers"
```
