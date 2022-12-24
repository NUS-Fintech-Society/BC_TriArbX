# Smart Contract for Executing Swaps

Within `/contract`,

## To Set Up
- After downloading foundry,
```bash
forge install
forge build
```

## To Test
- For Mainnet Infura
- Duplicate dev.env to .env file within the Contract folder
- add keys from infura app 

```bash
forge test --fork-url mainnet-infura
```