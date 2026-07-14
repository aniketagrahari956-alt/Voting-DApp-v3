# VoteChain — Decentralized Voting DApp

VoteChain is a blockchain-based decentralized voting platform built as a final-year academic project. It combines an on-chain Solidity smart contract deployed on the **Polygon Amoy testnet** with a React + TypeScript frontend and a Node/Express/MongoDB backend, giving it the transparency and tamper-resistance of the blockchain along with the speed and usability of a traditional web app.

**🔗 Live Demo:** [voting-dapp.ai.studio](https://voting-dapp.ai.studio)

---

## 📖 Overview

Traditional voting systems struggle with transparency, auditability, and trust. VoteChain addresses this by casting every vote as an on-chain transaction — immutable, publicly verifiable, and resistant to tampering — while keeping the day-to-day experience (voter onboarding, dashboards, results) fast and user-friendly through an off-chain backend that mirrors on-chain events.

## ✨ Key Features

- **Hybrid on-chain / off-chain architecture** — votes, candidates, and tallies live on the smart contract; richer metadata (candidate bios, voter details, audit logs) is stored in MongoDB for fast queries.
- **Role-based access control** — Solidity modifiers (`onlyOwner`, `onlyAdmin`) enforce who can manage elections, add candidates, or register voters.
- **Wallet-based admin authentication** — admins authenticate by signing a message with their wallet, verified on the backend via `ethers.verifyMessage` (no passwords).
- **Multi-election support** — elections are scoped by `currentElectionId`, so the same contract can run multiple voting cycles with isolated candidates and results.
- **Live event synchronization** — a background `eventSync` worker listens to on-chain events and mirrors them into MongoDB in near real time.
- **Bulk voter onboarding** — admins can bulk-register voters by uploading CSV, Excel, PDF, or Word files.
- **Phase-gated elections** — contract enforces `Setup → Voting → Ended` phases, so votes can only be cast during the active voting window.
- **Circuit-breaker pause mechanism** — admins can pause/unpause the contract in emergencies.
- **Results visualization** — live results and historical election data rendered with Recharts.
- **MetaMask wallet integration** — connect, sign, and transact directly from the browser via `ethers.js v6`.

## 🏗️ Architecture

```
┌─────────────────────┐        ┌──────────────────────┐        ┌───────────────────────┐
│   React + TypeScript │◄──────►│  Express / Node API   │◄──────►│   MongoDB (metadata,   │
│   Frontend (Vite)    │  REST  │  + eventSync worker   │        │   voter requests, logs)│
└──────────┬───────────┘        └───────────┬──────────┘        └───────────────────────┘
           │                                 │
           │ ethers.js v6 (MetaMask)         │ listens to contract events
           ▼                                 ▼
┌─────────────────────────────────────────────────────────┐
│        VotingSystem.sol — Polygon Amoy Testnet           │
│  (candidates, votes, phases, admins, election scoping)   │
└─────────────────────────────────────────────────────────┘
```

- **On-chain**: candidate registry, vote casting, phase management, admin roles, pause switch — all enforced by the smart contract.
- **Off-chain**: voter metadata, bulk onboarding, audit logs, and a synced read-cache of on-chain state for fast dashboards.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity (`^0.8.19`), deployed on Polygon Amoy testnet |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Blockchain Client | ethers.js v6, MetaMask |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Charts | Recharts |
| File Parsing | PapaParse (CSV), SheetJS/xlsx (Excel), pdfjs-dist (PDF), Mammoth (Word) |

## 📂 Project Structure

```
voting-dapp/
├── src/
│   ├── components/          # React UI components
│   │   ├── AdminDashboard.tsx
│   │   ├── ApplyToVote.tsx
│   │   ├── ConnectWallet.tsx
│   │   ├── ElectionHistory.tsx
│   │   ├── PhaseBanner.tsx
│   │   ├── ResultsPage.tsx
│   │   ├── VoterBulkUpload.tsx
│   │   ├── VoterDashboard.tsx
│   │   └── VoterRequestsPanel.tsx
│   ├── context/
│   │   └── Web3Context.tsx  # Wallet / contract connection state
│   ├── contracts/
│   │   ├── VotingSystem.sol
│   │   ├── VotingSystem.ts
│   │   └── VotingSystemABI.json
│   ├── backend/
│   │   ├── models/          # Mongoose schemas (Voter, Candidate, AuditLog, VoterRequest...)
│   │   ├── routes/          # Express REST API
│   │   ├── sync/            # eventSync.ts — on-chain → MongoDB mirror
│   │   └── utils/           # auth.ts — wallet-signature admin auth
│   ├── App.tsx
│   └── main.tsx
├── server.ts                 # Express entry point
├── vite.config.ts
└── package.json
```

## 🔌 API Reference

The backend exposes a REST API under `/api`, backed by MongoDB and synced with on-chain state:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/candidates` | List candidates for the current election |
| GET/PUT | `/candidates/:id/metadata` | Get/update off-chain candidate metadata |
| GET | `/results` | Live results for the current election |
| GET | `/history/:electionId` | Results for a past election |
| GET | `/voters/:address/status` | Check a voter's registration/voting status |
| GET | `/voter-requests` | List pending voter registration requests |
| GET | `/voter-requests/:walletAddress` | Get a specific voter request |
| POST | `/voter-requests/:id/approve` | Approve a voter request |
| POST | `/voter-requests/:id/reject` | Reject a voter request |
| GET | `/audit-log` | Admin action audit trail |

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB instance (local or hosted, e.g. MongoDB Atlas)
- MetaMask browser extension
- A wallet funded with Polygon Amoy testnet MATIC ([faucet](https://faucet.polygon.technology/))

### Installation

```bash
# Clone the repository
git clone https://github.com/aniketagrahari956-alt/Voting-DApp-v3.git
cd Voting-DApp-v3/voting-dapp

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# MongoDB connection string
MONGODB_URI=your_mongodb_connection_string

# Deployed contract address on Polygon Amoy
CONTRACT_ADDRESS=your_deployed_contract_address

# RPC URL for Polygon Amoy testnet
RPC_URL=your_polygon_amoy_rpc_url
```

### Run Locally

```bash
npm run dev
```

The app will start locally with the Vite dev server and the Express API running together via `tsx server.ts`.

### Build for Production

```bash
npm run build
npm start
```

## 🧾 Smart Contract

The core contract, `VotingSystem.sol`, implements:

- Candidate registration and management per election
- Voter registration and one-vote-per-address enforcement
- Phase control (`Setup`, `Voting`, `Ended`)
- Owner/admin role management
- Pause/unpause circuit breaker
- Multi-election support via `currentElectionId`

Deployed and verified on **Polygon Amoy Testnet**.

## 🗺️ Roadmap

- [ ] Mainnet deployment
- [ ] Voter identity verification integration
- [ ] Enhanced audit-log dashboard for admins
- [ ] Multi-language support

## 🤝 Contributing

This is an academic project, but suggestions and pull requests are welcome. Feel free to open an issue to discuss what you'd like to change.

## 📄 License

MIT

## 👤 Author

**Aniket Agrahari**
GitHub: [@aniketagrahari956-alt](https://github.com/aniketagrahari956-alt)

---

*Built as a final-year academic project exploring decentralized, transparent, and tamper-resistant voting systems on the blockchain.*
