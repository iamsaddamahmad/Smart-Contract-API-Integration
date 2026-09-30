const { ethers } = require("ethers");
const { config, validateConfig } = require("../config");
const { AppError } = require("../errors");

// Minimal human-readable ABI: only the functions we actually call
const ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function owner() view returns (address)", // optional: not every token has it
];

let provider; // created once and reused across requests
function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId, {
      staticNetwork: true, // skip auto-detection; fail fast if the RPC is down
    });
  }
  return provider;
}

// Stops requests hanging forever when the RPC is slow or unreachable
function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${config.rpcTimeoutMs}ms`)),
      config.rpcTimeoutMs
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function getContractInfo() {
  // 1. Configuration
  const problems = validateConfig();
  if (problems.length) {
    throw new AppError(500, "INVALID_CONFIG", problems.join("; "));
  }

  const address = ethers.getAddress(config.contractAddress); // checksummed
  const rpc = getProvider();

  // 2. Network connectivity + confirm a contract exists at this address
  let code, network, blockNumber;
  try {
    [code, network, blockNumber] = await withTimeout(
      Promise.all([rpc.getCode(address), rpc.getNetwork(), rpc.getBlockNumber()]),
      "RPC request"
    );
  } catch (err) {
    console.error("RPC error:", err.shortMessage || err.message);
    throw new AppError(503, "NETWORK_ERROR", "Unable to reach the blockchain RPC endpoint");
  }
  if (code === "0x") {
    throw new AppError(404, "NOT_A_CONTRACT", `No contract found at ${address} on this network`);
  }

  // 3. Read contract data. allSettled lets optional fields fail independently.
  const contract = new ethers.Contract(address, ABI, rpc);
  const fields = ["name", "symbol", "decimals", "totalSupply", "owner"];
  let settled;
  try {
    settled = await withTimeout(
      Promise.allSettled(fields.map((f) => contract[f]())),
      "Contract read"
    );
  } catch (err) {
    console.error("Contract read error:", err.message);
    throw new AppError(503, "NETWORK_ERROR", "Timed out while reading the contract");
  }
  const result = Object.fromEntries(fields.map((f, i) => [f, settled[i]]));

  // Required fields: if any fail, this isn't a usable ERC-20 contract
  const missing = ["name", "symbol", "decimals", "totalSupply"].filter(
    (f) => result[f].status === "rejected"
  );
  if (missing.length) {
    throw new AppError(
      502,
      "INVALID_CONTRACT_RESPONSE",
      `Contract did not return expected data for: ${missing.join(", ")}. Is it an ERC-20 token?`
    );
  }

  const decimals = Number(result.decimals.value);
  const totalSupplyRaw = result.totalSupply.value;
  const warnings = [];
  let owner = null;
  if (result.owner.status === "fulfilled") owner = result.owner.value;
  else warnings.push("owner() is not available on this contract");

  return {
    name: result.name.value,
    symbol: result.symbol.value,
    decimals,
    totalSupply: ethers.formatUnits(totalSupplyRaw, decimals),
    totalSupplyRaw: totalSupplyRaw.toString(), // BigInt is not JSON-serialisable
    owner,
    contractAddress: address,
    network: { chainId: Number(network.chainId), name: network.name },
    blockNumber,
    warnings,
  };
}

module.exports = { getContractInfo };
