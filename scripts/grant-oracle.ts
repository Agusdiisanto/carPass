import { network } from 'hardhat'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const { ethers } = await network.create()

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function resolveOracleAddress() {
  const envAddress =
    process.env.CARPASS_ORACLE_CONTRACT_ADDRESS ??
    process.env.VITE_CARPASS_ORACLE_CONTRACT_ADDRESS
  if (envAddress) return envAddress

  const deploymentPath = join(process.cwd(), 'deployments', 'sepolia', 'CarPassOracle.json')
  if (existsSync(deploymentPath)) {
    return readJson(deploymentPath).address as string
  }

  throw new Error(
    'CarPassOracle address not configured. Set CARPASS_ORACLE_CONTRACT_ADDRESS or run deploy:oracle:sepolia first.',
  )
}

function resolveTargetWallet() {
  const fromEnv = process.env.ORACLE_TARGET_WALLET?.trim()
  if (fromEnv && ethers.isAddress(fromEnv)) return ethers.getAddress(fromEnv)

  const arg = process.argv.find((value) => value.startsWith('0x') && value.length === 42)
  if (arg && ethers.isAddress(arg)) return ethers.getAddress(arg)

  throw new Error(
    'Target wallet missing. Set ORACLE_TARGET_WALLET in .env or pass 0x... as script argument.',
  )
}

const artifact = readJson(
  join(process.cwd(), 'artifacts', 'contracts', 'CarPassOracle.sol', 'CarPassOracle.json'),
)
const contractAddress = resolveOracleAddress()
const targetWallet = resolveTargetWallet()

if (!ethers.isAddress(contractAddress)) {
  throw new Error(`Invalid CarPassOracle address: ${contractAddress}`)
}

const [admin] = await ethers.getSigners()
const oracle = new ethers.Contract(contractAddress, artifact.abi, admin)
const oracleRole = await oracle.ORACLE_ROLE()
const adminRole = await oracle.DEFAULT_ADMIN_ROLE()

const adminHasRole = await oracle.hasRole(adminRole, admin.address)
if (!adminHasRole) {
  throw new Error(`Signer ${admin.address} is not admin on ${contractAddress}`)
}

const alreadyOracle = await oracle.hasRole(oracleRole, targetWallet)
if (alreadyOracle) {
  console.log('Already has ORACLE_ROLE:', targetWallet)
  process.exit(0)
}

console.log('Contract:', contractAddress)
console.log('Admin signer:', admin.address)
console.log('Granting ORACLE_ROLE to:', targetWallet)

const tx = await oracle.grantRole(oracleRole, targetWallet)
console.log('Tx sent:', tx.hash)
await tx.wait()

console.log('Done. Wallet can call submitAttestation/submitEvidenceBatch on Sepolia.')
