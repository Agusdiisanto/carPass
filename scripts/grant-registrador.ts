import { network } from 'hardhat'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const { ethers } = await network.create()

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function resolveContractAddress() {
  const envAddress =
    process.env.CARPASS_CONTRACT_ADDRESS ??
    process.env.VITE_CARPASS_CONTRACT_ADDRESS
  if (envAddress) return envAddress

  const deploymentPath = join(process.cwd(), 'deployments', 'sepolia', 'CarPass.json')
  if (existsSync(deploymentPath)) {
    return readJson(deploymentPath).address as string
  }

  throw new Error(
    'CarPass address not configured. Set CARPASS_CONTRACT_ADDRESS or run deploy:sepolia first.',
  )
}

function resolveTargetWallet() {
  const fromEnv = process.env.GRANT_TARGET_WALLET?.trim()
  if (fromEnv && ethers.isAddress(fromEnv)) return ethers.getAddress(fromEnv)

  const arg = process.argv.find((value) => value.startsWith('0x') && value.length === 42)
  if (arg && ethers.isAddress(arg)) return ethers.getAddress(arg)

  throw new Error(
    'Target wallet missing. Set GRANT_TARGET_WALLET in .env or pass 0x... as script argument.',
  )
}

const artifact = readJson(
  join(process.cwd(), 'artifacts', 'contracts', 'CarPass.sol', 'CarPass.json'),
)
const contractAddress = resolveContractAddress()
const targetWallet = resolveTargetWallet()

if (!ethers.isAddress(contractAddress)) {
  throw new Error(`Invalid CarPass address: ${contractAddress}`)
}

const [admin] = await ethers.getSigners()
const carPass = new ethers.Contract(contractAddress, artifact.abi, admin)
const registradorRole = await carPass.REGISTRADOR_ROLE()
const adminRole = await carPass.DEFAULT_ADMIN_ROLE()

const adminHasRole = await carPass.hasRole(adminRole, admin.address)
if (!adminHasRole) {
  throw new Error(`Signer ${admin.address} is not admin on ${contractAddress}`)
}

const alreadyRegistrador = await carPass.hasRole(registradorRole, targetWallet)
if (alreadyRegistrador) {
  console.log('Already has REGISTRADOR_ROLE:', targetWallet)
  process.exit(0)
}

console.log('Contract:', contractAddress)
console.log('Admin signer:', admin.address)
console.log('Granting REGISTRADOR_ROLE to:', targetWallet)

const tx = await carPass.grantRole(registradorRole, targetWallet)
console.log('Tx sent:', tx.hash)
await tx.wait()

console.log('Done. Wallet can call registrarVehiculo on Sepolia.')
