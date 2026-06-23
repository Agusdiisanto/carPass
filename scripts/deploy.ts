import { network } from "hardhat";

const { ethers } = await network.create();

const [deployer] = await ethers.getSigners();

console.log("Deploying CarPass with account:", deployer.address);

const carPass = await ethers.deployContract("CarPass");
await carPass.waitForDeployment();

console.log("CarPass deployed to:", await carPass.getAddress());
