require("dotenv").config();
const { ethers } = require("ethers");

const config = {
  port: Number(process.env.PORT) || 5000,
  rpcUrl: process.env.RPC_URL,
  contractAddress: process.env.CONTRACT_ADDRESS,
  rpcTimeoutMs: Number(process.env.RPC_TIMEOUT_MS) || 10000,
  chainId: Number(process.env.CHAIN_ID) || 1,
};

// Returns a list of problems instead of throwing, so the API can report
// a clear error to the client rather than the process crashing.
function validateConfig() {
  const problems = [];
  if (!config.rpcUrl) problems.push("RPC_URL is not set");
  if (!config.contractAddress) problems.push("CONTRACT_ADDRESS is not set");
  else if (!ethers.isAddress(config.contractAddress))
    problems.push("CONTRACT_ADDRESS is not a valid address");
  return problems;
}

module.exports = { config, validateConfig };
