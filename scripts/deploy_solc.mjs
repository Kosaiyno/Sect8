import fs from 'fs';
import path from 'path';
import solc from 'solc';
import { Wallet, ContractFactory, JsonRpcProvider } from 'ethers';

// Lightweight .env loader (no external deps)
function loadEnv(envPath = '.env') {
  try {
    const full = path.resolve(envPath);
    if (!fs.existsSync(full)) return;
    const content = fs.readFileSync(full, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx);
      const value = trimmed.slice(idx + 1);
      if (!process.env[key]) process.env[key] = value;
    });
  } catch (e) {
    // ignore
  }
}

loadEnv();

function findImports(importPath) {
  try {
    // Resolve node_modules imports (e.g., @openzeppelin/...)
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      const moduleRoot = parts.shift();
      const resolved = path.resolve('node_modules', moduleRoot, ...parts);
      const contents = fs.readFileSync(resolved, 'utf8');
      return { contents };
    }

    // Relative import from contracts folder
    const resolved = path.resolve('contracts', importPath);
    if (fs.existsSync(resolved)) {
      return { contents: fs.readFileSync(resolved, 'utf8') };
    }

    return { error: 'File not found: ' + importPath };
  } catch (err) {
    return { error: err.message };
  }
}

async function main() {
  const contractPath = path.join('contracts', 'Sect8AgentManager.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'Sect8AgentManager.sol': { content: source },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  if (output.errors) {
    const errors = output.errors.filter((e) => e.severity === 'error');
    if (errors.length) {
      console.error('Compilation errors:');
      errors.forEach((e) => console.error(e.formattedMessage || e.message));
      process.exit(1);
    }
  }

  const contractOutput = output.contracts['Sect8AgentManager.sol']['Sect8AgentManager'];
  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm.bytecode.object;

  const rpcCandidates = [process.env.OG_RPC_URL, process.env.NEXT_PUBLIC_0G_RPC_URL, process.env.NEXT_PUBLIC_0G_RPC_URL];
  const rpc = rpcCandidates.find((r) => r && r.length);
  if (!rpc) {
    console.error('OG_RPC_URL not set in environment');
    process.exit(1);
  }

  const privateKey = process.env.AGENT_DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('AGENT_DEPLOYER_PRIVATE_KEY not set in environment');
    process.exit(1);
  }

  // Try provider candidates in order until one connects
  let provider;
  const tried = [];
  for (const candidate of rpcCandidates) {
    if (!candidate) continue;
    tried.push(candidate);
    try {
      const p = new JsonRpcProvider(candidate);
      // quick network detection
      await p.getNetwork();
      provider = p;
      break;
    } catch (e) {
      // continue to next candidate
    }
  }

  if (!provider) {
    console.error('Failed to connect to any RPC endpoint:', tried.join(', '));
    process.exit(1);
  }

  const wallet = new Wallet(privateKey, provider);

  console.log('Deploying Sect8AgentManager via raw Ethers deploy...');
  const factory = new ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('Deployed at:', address);

  // Update .env with deployed address
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, 'utf8');
    env = env.replace(/AGENT_MANAGER_ADDRESS=.*/g, `AGENT_MANAGER_ADDRESS=${address}`);
    env = env.replace(/NEXT_PUBLIC_AGENT_MANAGER_ADDRESS=.*/g, `NEXT_PUBLIC_AGENT_MANAGER_ADDRESS=${address}`);
    fs.writeFileSync(envPath, env, 'utf8');
    console.log('Updated .env with AGENT_MANAGER_ADDRESS and NEXT_PUBLIC_AGENT_MANAGER_ADDRESS');
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
