import { network } from "hardhat";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const { ethers } = await network.create();

const [deployer] = await ethers.getSigners();

console.log("Deploying CarPass with account:", deployer.address);

const carPass = await ethers.deployContract("CarPass");
await carPass.waitForDeployment();

const address = await carPass.getAddress();
const deploymentTx = carPass.deploymentTransaction();
const receipt = deploymentTx === null ? null : await deploymentTx.wait();
const chain = await ethers.provider.getNetwork();

console.log("CarPass deployed to:", address);
if (deploymentTx !== null) {
  console.log("Deployment tx:", deploymentTx.hash);
}

const deploymentDir = join(process.cwd(), "deployments", "sepolia");
await mkdir(deploymentDir, { recursive: true });
await writeFile(
  join(deploymentDir, "CarPass.json"),
  `${JSON.stringify(
    {
      contractName: "CarPass",
      network: "sepolia",
      chainId: chain.chainId.toString(),
      address,
      deployer: deployer.address,
      transactionHash: deploymentTx?.hash ?? "",
      blockNumber: receipt?.blockNumber ?? null,
      deployedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);

console.log("Deployment artifact written to deployments/sepolia/CarPass.json");
