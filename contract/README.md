# Smart Contract for Executing Swaps

(Within the Contract folder)

## To Set Up
```bash
forge install
forge build
```

## To Test (Mainnet)
- Duplicate dev.env to .env file within the Contract folder
- add MAINNET_API_KEY from Alchemy app 

```bash
forge test --fork-url mainnet
```