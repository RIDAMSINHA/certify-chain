
import { ethers } from 'hardhat';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
  const certificateNFT = await CertificateNFT.deploy();
  await certificateNFT.waitForDeployment();

  const address = await certificateNFT.getAddress();
  console.log("CertificateNFT deployed to:", address);

  // Save the contract address
  const config = {
    contractAddress: address,
    network: network.name,
  };

  writeFileSync(
    join(__dirname, '../src/contract-config.json'),
    JSON.stringify(config, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
