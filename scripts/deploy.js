const { ethers, network } = require("hardhat");
const { writeFileSync } = require("fs");
const { join } = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const CertifyChain = await ethers.getContractFactory("CertifyChain");
  const certifyChain = await CertifyChain.deploy();
  
  // Wait for the deployment to finish (ethers v6 style)
  await certifyChain.waitForDeployment();

  // Use the 'target' property to get the deployed contract address in ethers v6
  const address = certifyChain.target;
  console.log("CertifyChain deployed to:", address);

  // Save the contract address to a configuration file
  const config = {
    contractAddress: address,
    network: network.name,
  };

  writeFileSync(
    join(__dirname, "../src/contract-config.json"),
    JSON.stringify(config, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
