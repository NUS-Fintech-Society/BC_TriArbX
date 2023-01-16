# Triangular Arbitrage process

## Preprocessing of required data

1. We converted the default Uniswap V3 token list from json to a token list that allowed us to easily access the token's ticker symbol and its address. Data is stored in the `utils/uniswap/store/tokenDS.ts` in the following format:

   ```typescript
       {
           "1INCH": {
               name: "1inch",
               symbol: "1INCH",
               address: "0x111111111117dC0aa78b770fA6A738034120C302",
           },
           <Token Symbol>: {
               name: string,
               symbol: string,
               address: string,
           },
           ...the rest of token details
       }
   ```

2. From the token list, we formed every possible token pair and queried the pool address for each pair from Uniswap. Data is stored in the `utils/uniswap/store/poolAddressDS.ts` in the following format:

   ```typescript
       {
           "1INCH": {
               DAI: {
                   100: "0x063332BBF9F8385e4106919b5c6AE2E6a4f72228",
                   3000: "0xF4410C58D13820D5eBa1a563e592ED015c4e3c80",
                   10000: "0xd921A81445Ff6A9114deb7Db011F5ef8353F0bBc",
               },
               MANA: {
                   10000: "0x017c5E3912CD04982EB27a6C8f32cD5D31BD89e9",
               },
               ...the rest of the pool pair
           },
           <Token Symbol>: {
               <Token Symbol>: {
                   <Pool Fee>: <Pool Address> ,
                   <Pool Fee>: <Pool Address> ,
               },
           },
           ...the rest of pair
       }
   ```

   The pool fee is in the hundredth place. This means a pool fee of 3_000 = 3_000 / 10_000 = 0.3%

3. Based on the existing pool addresses, we generated all the possible triangular paths that forms a cycle from tokenA to tokenB, tokenB to tokenC, and tokenC back to tokenA. Data is stored in the `utils/uniswap/store/triangleDS.ts` in the following format:

   ```typescript
       [
           [Token A Symbol, Token B Symbol, Token C Symbol],
           [string, string ,string],
       ]
   ```

4. For certain token pairs, there exists multiple pool address, each corresopnding to a different fee tier. Uniswap V3 has four different fee tiers for liquidity providers - 0.01%, 0.05%, 0.30%, 1.00%. For any given token pair, we have narrowed our search algorithm to only **consider the pool address with the highest fee tier** since these pools generally have the most liquidity.

## Getting of triangular arbitrage rates

To work with Uniswap's SDK, we had to refer to their [documentation](https://docs.uniswap.org/sdk/v3/guides/quick-start) to help us interact with their contract without directly accessing the contract. We used Metamask as our RPC provider which means that user would have to connect their wallet to view the data and interact with the smart contract.

### The function to get the rates

`getTriangleRate` is the main function to retrieve the triangular arbitrage rate of a triangular path that takes in 2 arguments. `ethereum` the ethereum object that is injected by Metamask wallet and `String[]` an array that holds the swap path in sequence.

To get a rate of a triangular path of AAVE => COMP => WETH => AAVE,

```typescript
// Prototype
const getTriangleRate = async (
	ethereum:
		| ethers.providers.ExternalProvider
		| ethers.providers.JsonRpcFetchFunc,
	tokenPath: string[]
)

// Usage
getTriangleRate(window.ethereum, ["AAVE", "COMP", "WETH"]);
```

### Data files used

1. `tokenDS.ts` // To get the token details
2. `poolAddressDS.ts` // To get the pool addresses
3. `triangleDS.ts` // To get the available triangular path

## Behind the barrier of abstraction of `getTriangleRate`

1. Retrieving the RPC provider from Metamask

   ```typescript
   // Function
   const getProvider = async (
   	ethereum:
   		| ethers.providers.ExternalProvider
   		| ethers.providers.JsonRpcFetchFunc
   ) => {
   	return new ethers.providers.Web3Provider(ethereum);
   };

   // Usage
   const provider = await getProvider(ethereum);
   ```

2. We get the token details of 3 tokens from the user input so that we can have a standardised information to process later.

   ```typescript
   // Function
   const getTokenDetail = async (
   	tokenSymbol: string,
   	provider: ethers.providers.Web3Provider
   ): Promise<TokenDetail> => {
   	const tokenDetail = tokenDS[tokenSymbol.toUpperCase()];
   	const contract = new Contract(tokenDetail.address, ERC20.abi, provider);
   	const chainId = (await provider.getNetwork()).chainId;

   	return { ...tokenDetail, contract, chainId };
   };

   // Usage
   const tokenDetailA: TokenDetail = await getTokenDetail(
   	tokenPath[0], // Token A
   	provider
   );
   ```

3. Getting of pool address so that we can get information such as the swap rate of 2 tokens

   ```typescript
   // Function
   const getPoolAddress = (tokenA: string, tokenB: string): string => {
   	const poolAddressA = poolAddressDS[tokenA];
   	if (!poolAddressA)
   		throw new Error(tokenA + "-" + tokenB + "pool address does not exist");

   	const poolAddressB = poolAddressA[tokenB];

   	if (!poolAddressB)
   		throw new Error(tokenA + "-" + tokenB + "pool address does not exist");

   	const result = poolAddressB[getPoolFee(tokenA, tokenB)];
   	return result;
   };

   // Usage
   const poolAddressAB: string = getPoolAddress(
   	tokenDetailA.symbol,
   	tokenDetailB.symbol
   );
   ```

4. Once the pool address is retrieved, we now create a Contract object so that we can interact with the pool.

   ```typescript
   // Usage
   const poolContractAB: Contract = new Contract(
   	poolAddressAB,
   	IUniswapV3PoolABI,
   	provider
   );
   ```

5. From the pool contract, we will then retrieve the `immutables` and `state` so that we can create the tokens that we need.

   ```typescript
   // Function
   const getTriangleData = async (
   	poolContracts: Contract[]
   ): Promise<[Immutables, State][]> => {
   	const [poolContractAB, poolContractBC, poolContractCA] = poolContracts;
   	const [immutablesAB, stateAB]: [Immutables, State] = await Promise.all([
   		getPoolImmutables(poolContractAB),
   		getPoolState(poolContractAB),
   	]);
   	const [immutablesBC, stateBC]: [Immutables, State] = await Promise.all([
   		getPoolImmutables(poolContractBC),
   		getPoolState(poolContractBC),
   	]);
   	const [immutablesCA, stateCA]: [Immutables, State] = await Promise.all([
   		getPoolImmutables(poolContractCA),
   		getPoolState(poolContractCA),
   	]);

   	return [
   		[immutablesAB, stateAB],
   		[immutablesBC, stateBC],
   		[immutablesCA, stateCA],
   	];
   };

   // Usage
   const [
   	[immutablesAB, stateAB],
   	[immutablesBC, stateBC],
   	[immutablesCA, stateCA],
   ] = await getTriangleData([poolContractAB, poolContractBC, poolContractCA]);
   ```

6. Creating the Token Object

   ```typescript
   // Function
   export const createTokens = async (
   	immutables: Immutables,
   	tokenDetailA: TokenDetail,
   	tokenDetailB: TokenDetail
   ) => {
   	const tokenA = new Token(
   		tokenDetailA.chainId,
   		immutables.token0,
   		await getDecimals(tokenDetailA),
   		tokenDetailA.symbol,
   		tokenDetailA.name
   	);
   	const tokenB = new Token(
   		tokenDetailB.chainId,
   		immutables.token1,
   		await getDecimals(tokenDetailB),
   		tokenDetailB.symbol,
   		tokenDetailB.name
   	);

   	// This ensures that the token order is correct
   	return immutables.token0 === tokenDetailA.address
   		? [tokenA, tokenB]
   		: [tokenB, tokenA];
   };

   // Usage
   const tokenAB = await createTokens(immutablesAB, tokenDetailA, tokenDetailB);
   ```

7. Creating a Pool instance

   ```typescript
   // Usage
   const poolAB: Pool = new Pool(
   	tokenAB[0],
   	tokenAB[1],
   	immutablesAB.fee,
   	stateAB.sqrtPriceX96.toString(),
   	stateAB.liquidity.toString(),
   	stateAB.tick
   );
   ```

8. Getting the swap rates from the pool

   ```typescript
   // Function
   export const getTokenRateFromPool = (pool: Pool): number[] => {
   	// Rate of Token 0 / Token 1
   	const token0SwapRate: number = parseFloat(
   		pool.token0Price.toSignificant(6)
   	);
   	// Rate of Token 1 / Token 0
   	const token1SwapRate: number = parseFloat(
   		pool.token1Price.toSignificant(6)
   	);

   	return [token0SwapRate, token1SwapRate];
   };

   // Usage
   const [abA, abB] = getTokenRateFromPool(poolAB);
   const [bcB, bcC] = getTokenRateFromPool(poolBC);
   const [caC, caA] = getTokenRateFromPool(poolCA);
   ```

9. Handles the rates of quote and base token. This is because the path may be given by the user but the base and quote token is not specified by the user. This way we can just query the pool for which token is the base or quote and we just swap the rates around. Finally, we will just multiply the rates from `(Token A => Token B ) * (Token B => Token C) * (Token C => Token A)`

   ```typescript
   const rateAB = poolAB.token0.address === tokenDetailA.address ? abA : abB;
   const rateBC = poolBC.token0.address === tokenDetailB.address ? bcB : bcC;
   const rateCA = poolCA.token0.address === tokenDetailC.address ? caC : caA;

   const arbitrageRate = rateAB * rateBC * rateCA;
   ```

10. The returned results
    ```typescript
        {
            aTob: rateAB, // Rate of token A to token B
            bToc: rateBC, // Rate of token B to token C
            cToA: rateCA, // Rate of token C to token A
            arbitrageRate: arbitrageRate, // The final swap of the swap
        };
    ```

## The Final Script

```typescript
const getTriangleRate = async (
	ethereum:
		| ethers.providers.ExternalProvider
		| ethers.providers.JsonRpcFetchFunc,
	tokenPath: string[]
) => {
	const provider = await getProvider(ethereum);

	// 1. Get token details
	const tokenDetailA: TokenDetail = await getTokenDetail(
		tokenPath[0],
		provider
	);
	const tokenDetailB: TokenDetail = await getTokenDetail(
		tokenPath[1],
		provider
	);
	const tokenDetailC: TokenDetail = await getTokenDetail(
		tokenPath[2],
		provider
	);

	// 2. Get pool Addresses
	const poolAddressAB: string = getPoolAddress(
		tokenDetailA.symbol,
		tokenDetailB.symbol
	);
	const poolAddressBC: string = getPoolAddress(
		tokenDetailB.symbol,
		tokenDetailC.symbol
	);
	const poolAddressCA: string = getPoolAddress(
		tokenDetailC.symbol,
		tokenDetailA.symbol
	);

	// 3. Get pool contract. contractPool[]
	const poolContractAB: Contract = new Contract(
		poolAddressAB,
		IUniswapV3PoolABI,
		provider
	);
	const poolContractBC: Contract = new Contract(
		poolAddressBC,
		IUniswapV3PoolABI,
		provider
	);
	const poolContractCA: Contract = new Contract(
		poolAddressCA,
		IUniswapV3PoolABI,
		provider
	);

	// 4. Query the state and immutable variables of the pool
	const [
		[immutablesAB, stateAB], // Token A
		[immutablesBC, stateBC], // Token B
		[immutablesCA, stateCA], // Token C
	] = await getTriangleData([poolContractAB, poolContractBC, poolContractCA]);

	// 5. Create tokens
	const tokenAB = await createTokens(immutablesAB, tokenDetailA, tokenDetailB);
	const tokenBC = await createTokens(immutablesBC, tokenDetailB, tokenDetailC);
	const tokenCA = await createTokens(immutablesCA, tokenDetailC, tokenDetailA);

	// 6. Create Pool
	const poolAB: Pool = new Pool(
		tokenAB[0],
		tokenAB[1],
		immutablesAB.fee,
		stateAB.sqrtPriceX96.toString(),
		stateAB.liquidity.toString(),
		stateAB.tick
	);
	const poolBC: Pool = new Pool(
		tokenBC[0],
		tokenBC[1],
		immutablesBC.fee,
		stateBC.sqrtPriceX96.toString(),
		stateBC.liquidity.toString(),
		stateBC.tick
	);
	const poolCA: Pool = new Pool(
		tokenCA[0],
		tokenCA[1],
		immutablesCA.fee,
		stateCA.sqrtPriceX96.toString(),
		stateCA.liquidity.toString(),
		stateCA.tick
	);

	// 7. Get rate from pool
	const [abA, abB] = getTokenRateFromPool(poolAB);
	const [bcB, bcC] = getTokenRateFromPool(poolBC);
	const [caC, caA] = getTokenRateFromPool(poolCA);

	const rateAB = poolAB.token0.address === tokenDetailA.address ? abA : abB;
	const rateBC = poolBC.token0.address === tokenDetailB.address ? bcB : bcC;
	const rateCA = poolCA.token0.address === tokenDetailC.address ? caC : caA;

	const arbitrageRate = rateAB * rateBC * rateCA;

	return {
		aTob: rateAB,
		bToc: rateBC,
		cToA: rateCA,
		arbitrageRate: arbitrageRate,
	};
};
```

## Obstacles faced.

1. Uniswap documentation doesn't seem complete and is not exactly very useful. An example was the [fetching of spot prices](https://docs.uniswap.org/sdk/v3/guides/fetching-prices). In the documentation, we were told to use a getter method `token0Price` and `token1Price` to get the prices of the swap but the data returned was a `Price` object and no instruction was given on how to retrieve the price. We had to do some searching on [stackoverflow](https://ethereum.stackexchange.com/questions/127486/uniswap-v3-fetching-spot-prices-documentation-seems-incomplete?rq=1) to be show how prices are derieved from the methods.
2. Another issue faced that has not been resolve is the price derieved from `token0Price` and `token1Price`. Some of the swap rate given was more or less the same when compared to [Uniswap's swapping tool](https://app.uniswap.org/#/swap). However, some were inaccurate such as the swap rate of COMP and DAI was returned as 1 from the `getTriangleRate` but on Uniswap 1 COMP = 33.4112 DAI.
   </br></br>##TODO This issue has not been resolved.
