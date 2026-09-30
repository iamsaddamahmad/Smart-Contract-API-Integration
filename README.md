# Smart Contract API Integration

A small Node.js application that reads data from a public smart contract and exposes it through a REST API, plus a simple frontend that displays the result.

- **Backend:** Node.js, Express, ethers.js v6
- **Endpoint:** `GET /api/SaddamApiTest`
- **Contract (default):** Circle's USDC on **Ethereum Sepolia** testnet (`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`)
- **Frontend:** a plain HTML page served by the same Express app (no build step)

All contract values are read live from the blockchain. Nothing is hardcoded in the response.

## Demo

Demo video: `<add link here>`

## Getting started

### Prerequisites

- Node.js 18 or higher
- A Sepolia RPC endpoint (a free public one works)

### Install and run

```bash
git clone https://github.com/iamsaddamahmad/Smart-Contract-API-Integration.git
cd Smart-Contract-API-Integration
npm install
cp .env.example .env        # then edit the values if needed
npm run dev                 # or: npm start
```

Open:

- Frontend: http://localhost:5000
- API: http://localhost:5000/api/SaddamApiTest

## Configuration

All configuration comes from environment variables (`.env`, which is not committed).

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `RPC_URL` | Blockchain RPC endpoint | `https://ethereum-sepolia-rpc.publicnode.com` |
| `CONTRACT_ADDRESS` | ERC-20 contract to read | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| `RPC_TIMEOUT_MS` | Timeout for RPC calls in milliseconds | `10000` |
| `CHAIN_ID` | Chain ID (keep in sync with `RPC_URL`) | `11155111` |

The RPC URL, chain ID, and contract address must all belong to the same network. To use another chain, change these three values. No code changes are needed.

> Public RPC endpoints can be rate-limited or unavailable. If one fails, try another Sepolia endpoint or use a free Alchemy or Infura key.

## API

### `GET /api/SaddamApiTest`

Returns information about the configured contract.

**Success (200)**

```json
{
  "success": true,
  "data": {
    "name": "USDC",
    "symbol": "USDC",
    "decimals": 6,
    "totalSupply": "<formatted supply>",
    "totalSupplyRaw": "<raw integer as string>",
    "owner": "0x...",
    "contractAddress": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "network": { "chainId": 11155111, "name": "sepolia" },
    "blockNumber": 0,
    "warnings": []
  }
}
```

`totalSupply` is formatted using the token's decimals. `totalSupplyRaw` is the raw on-chain integer as a string, because BigInt values cannot be serialised to JSON. `owner` is `null` (with an entry in `warnings`) if the contract has no `owner()` function.

**Error**

```json
{
  "success": false,
  "error": { "code": "NETWORK_ERROR", "message": "Unable to reach the blockchain RPC endpoint" }
}
```

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_CONFIG` | 500 | Missing or invalid `RPC_URL` or `CONTRACT_ADDRESS` |
| `NETWORK_ERROR` | 503 | RPC endpoint unreachable, rejected the request, or timed out |
| `NOT_A_CONTRACT` | 404 | No contract exists at the configured address on this network |
| `INVALID_CONTRACT_RESPONSE` | 502 | Required fields missing or unexpected response (not an ERC-20) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Project structure

```
src/
  index.js                      Server start-up
  app.js                        Express setup (static files, routes, error handler)
  config.js                     Environment variables and validation
  errors.js                     AppError class (status + error code)
  routes/apiTest.js             Route definition
  services/contractService.js   All blockchain logic (ethers.js)
  middleware/errorHandler.js    Central error handling
public/
  index.html                    Frontend page
```

## Design notes

- **Separation of concerns:** the route only calls the service. All blockchain logic lives in `contractService.js`, and errors are formatted in one place.
- **Error handling:** config validation, a check that the address is actually a contract, RPC timeouts, and specific error codes instead of a generic 500.
- **Optional data:** required fields (name, symbol, decimals, total supply) must succeed. Optional fields (owner) use `Promise.allSettled`, so a missing `owner()` adds a warning instead of failing the request.
- **Frontend safety:** the page renders values with `textContent`, so contract-provided strings cannot inject HTML. It shows loading, error, and success states.
- **Secrets:** configuration is read from environment variables. `.env` is git-ignored and only `.env.example` is committed.

## Testing the error handling

Change one value in `.env`, restart the server, and call the endpoint:

| Change | Expected result |
|---|---|
| `CONTRACT_ADDRESS=0x123` | `INVALID_CONFIG` |
| `RPC_URL=https://bad.example.com` | `NETWORK_ERROR` |
| `CONTRACT_ADDRESS` set to a normal wallet address | `NOT_A_CONTRACT` |
| `CONTRACT_ADDRESS` set to a non-ERC-20 contract | `INVALID_CONTRACT_RESPONSE` |

## Possible improvements

- Short-lived response caching to reduce RPC calls
- A fallback list of RPC providers
- Automated tests with a mocked provider
- Rate limiting on the API
