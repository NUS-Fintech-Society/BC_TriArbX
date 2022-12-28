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

## Function
```typescript
function executeTriangularArbitrage(
        address[3] memory tokens,
        uint24[3] memory poolFees,
        uint256 amountIn
    ) external returns (uint256 amountOut) {}
```
- Parameters: array of [token address A, token address B, token address C], array of [poolfee AB, poolfee BC, poolfee CA], number of token A to swap 
- Pre-requisites: User needs to have more than or equal to "amount in" of token A