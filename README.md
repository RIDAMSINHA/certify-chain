# Certify Chain Project

This project is built with React, Shadcn, TypeScript, and Hardhat. It integrates a backend (via Supabase) and uses a local Hardhat blockchain for smart contract development and deployment.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/)
- [MetaMask](https://metamask.io/) browser extension for blockchain interactions
- A Supabase account (if applicable)

## Installation

1. **Clone the Repository:**

   ```bash
   git clone <your-repo-url>
   cd <your-project-directory>
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Running the Frontend/Backend Server:**
   ```bash
   npm run dev
   ```

## Working with the Hardhat

1. **Start Hardhat:**
    npx hardhat node

2. **Deploy Contracts:**
    npx hardhat run scripts/deploy.js --network localhost

# Additional Information
MetaMask Setup:
Add a custom network in MetaMask with:

RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH
Contract Address:
Ensure that your frontend is updated with the deployed contract address from src/contract-config.json


