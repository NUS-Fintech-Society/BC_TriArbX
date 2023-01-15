# Smart Contract for Executing Swaps

In `/contract`,

## To Set Up

After downloading foundry,

```bash
forge install
forge build
```

## Addresses

Swap Router Address: 0xE592427A0AEce92De3Edee1F18E0157C05861564

(Swap router can be found here: https://docs.uniswap.org/contracts/v3/reference/deployments)

## Function

In `/lib/src/TriArbitrage.sol`,

```typescript
function executeTriangularArbitrage(
        address[3] memory tokens,
        uint24[3] memory poolFees,
        uint256 amountIn
    ) external returns (uint256 amountOut) {}
```

- Parameters: array of [token address A, token address B, token address C], array of [poolfee AB, poolfee BC, poolfee CA], number of token A to swap.
- Pre-requisites: User needs to have more than or equal to "amountIn" of token A, and MUST approve deployed contract to spend "amountIn" of token A before calling function.

## Fork Testing (Mainnet)

- Duplicate dev.env to .env file within the Contract folder.
- Add infura keys.
- Test case at `/lib/test/TriArbitrage.t.sol`
- mainnet-infura is an alias declared in `foundry.toml`

```bash
forge test --fork-url mainnet-infura
```

## Deploying and Testing with Cast

- To proceed with either mainnet or testnet, modify the `ETH_RPC_URL` environment variable OR use the `--rpc-url` flag for subsequent commands.
- Cast is Foundry's command-line tool for performing Ethereum RPC calls. You can make smart contract calls, send transactions, or retrieve any type of chain data - all from your command-line!
- Duplicate dev.env to .env file within the Contract folder.
- Add infura and wallet private keys.
- Obtain faucet goerli ETH, swap with "amountIn" of token A on Uniswap.

(Check your token A balance)

```bash
cast call <TOKEN_A_ADDRESS> "balanceOf(address)(uint256)" <YOUR_WALLET_ADDRESS>
```

1. To deploy contract

```bash
forge create --private-key <PRIVATE_KEY> src/TriArbitrage.sol:TriArbitrage --constructor-args <SWAP_ROUTER_ADDRESS>
```

2. To approve deployed contract to spend "amountIn" of token A

```bash
cast send <TOKEN_A_ADDRESS> --private-key <PRIVATE_KEY> "approve(address,uint256)" <DEPLOYED_CONTRACT_ADDRESS> <AMOUNT_IN>
```

3. Execute triangular swap function

Note: The transaction will only succeed if the pool exists, trade is profitable and have met the other requirements.

```bash
cast send <DEPLOYED_CONTRACT_ADDRESS> --private-key <PRIVATE_KEY> "executeTriangularArbitrage(address[3],uint24[3],uint256)(uint256)" "[<TOKEN_A_ADDRESS>,<TOKEN_B_ADDRESS>,<TOKEN_C_ADDRESS>]" "[<POOL_FEE_AB>,<POOL_FEE_BC>,<POOL_FEE_CA>]" <AMOUNT_IN>
```
