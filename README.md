
# Certify Chain


Certify Chain is a **blockchain-based certification system** designed to issue, manage, and verify certificates securely. Built with **React, Shadcn, TypeScript, and Hardhat**, it integrates **Supabase** for backend functionality and leverages a **local Hardhat blockchain** for smart contract execution.

---

## 🎥 Demo Video
#### Decentralized Certification Platform Overview 🌐   [Watch Video](https://www.loom.com/share/aa8ea07a80a343a4b231df4f049572b7?sid=f3fa3167-2b93-4c40-842f-430ff6d04a0a)

--- 

## 🚀 Features
- **Certificate Issuance**: Instantly issue verifiable blockchain-based certificates.  
- **Profile Sharing**: Users can create and share their certified profiles securely.  
- **Instant Certificate Verification**: Third parties can verify the authenticity of a certificate in real time.  
- **Decentralized Storage**: Ensures data integrity with blockchain-backed records.  
- **Secure Authentication**: Users sign transactions with MetaMask for added security.  


---

## 🛠️ Tech Stack
- **Frontend**: React, Shadcn, TypeScript
- **Backend**: Supabase 
- **Blockchain**: Hardhat (Ethereum development framework)
- **Smart Contracts**: Solidity

---

## 📌 Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/)
- [MetaMask](https://metamask.io/) browser extension

---

## 📥 Installation & Setup

### Clone the Repository
```bash
git clone https://github.com/RIDAMSINHA/certify-chain
cd certify-chain
```

### Install Dependencies
```bash
npm install

```

### Additional Dependencies
Install development tools:
```bash
npm install --save-dev \
  @nomicfoundation/hardhat-chai-matchers \
  @nomicfoundation/hardhat-network-helpers \
  @nomicfoundation/hardhat-verify \
  @typechain/ethers-v6 \
  @typechain/hardhat \
  @types/chai \
  @types/mocha \
  chai \
  hardhat-gas-reporter \
  solidity-coverage \
  typechain
```

### Start the Hardhat Node
```bash
npx hardhat node
```

### Deploy Smart Contracts
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Start the Development Server
```bash
npm run dev
```

---

### Configure MetaMask for Local Blockchain
Import test accounts using private keys from Hardhat node output. (e.g., console output after running npx hardhat node)<br/>
Add a custom network in MetaMask with:
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Currency Symbol**: `ETH`

---



## 📜 License
This project is licensed under the **MIT License**.

---

## 📞 Contact & Contributions
- **Issues & Feature Requests**: [Open an Issue](https://github.com/RIDAMSINHA/certify-chain/issues)
- **Contributions**: [Fork and Submit PR](https://github.com/RIDAMSINHA/certify-chain/fork)

---


