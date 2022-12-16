import { ethers } from "ethers";
import { poolImmutablesAbi } from "./abi";
import { Immutables, State } from "./type";
import { Pool, Route, Trade } from "@uniswap/v3-sdk";
import { CurrencyAmount, Token, TradeType } from "@uniswap/sdk-core";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { abi as QuoterABI } from "@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json";

/**
 * Returns the arbitrage rate from a token path
 *
 * @param ethereum
 * @param tokenPath
 */
export const getTriangleRate = async (ethereum: ethers.providers.ExternalProvider | ethers.providers.JsonRpcFetchFunc, tokenPath: string[]) => {
	const provider = await getProvider(ethereum);

	// 1. Get token details
	const tokenDetailA = getTokenDetail(tokenPath[0]);
	const tokenDetailB = getTokenDetail(tokenPath[1]);
	const tokenDetailC = getTokenDetail(tokenPath[2]);

	// 2. Get token address
	const tokenAddressA = tokenDetailA.address;
	const tokenAddressB = tokenDetailB.address;
	const tokenAddressC = tokenDetailC.address;

	// 3. Get pool Address
	const poolAddressAB: string = getPoolAddress(tokenDetailA.ticker, tokenDetailB.ticker);
	const poolAddressBC: string = getPoolAddress(tokenDetailB.ticker, tokenDetailC.ticker);
	const poolAddressCA: string = getPoolAddress(tokenDetailC.ticker, tokenDetailA.ticker);

	// 4. Get contract pool. contractPool[]
	const poolContractAB: ethers.Contract = new ethers.Contract(poolAddressAB, IUniswapV3PoolABI, provider);
	const poolContractBC: ethers.Contract = new ethers.Contract(poolAddressBC, IUniswapV3PoolABI, provider);
	const poolContractCA: ethers.Contract = new ethers.Contract(poolAddressCA, IUniswapV3PoolABI, provider);

	// 5. Query the state and immutable variables of the pool
	const [[immutablesAB, stateAB], [immutablesBC, stateBC], [immutablesCA, stateCA]] = await getTriangleData([poolContractAB, poolContractBC, poolContractCA]);

	// 6. Create tokens
	const tokenAB = createTokens(immutablesAB, tokenDetailA, tokenDetailB);
	const tokenBC = createTokens(immutablesBC, tokenDetailB, tokenDetailC);
	const tokenCA = createTokens(immutablesCA, tokenDetailC, tokenDetailA);

	// 7. Create Pool
	const poolAB: Pool = new Pool(tokenAB[0], tokenAB[1], immutablesAB.fee, stateAB.sqrtPriceX96.toString(), stateAB.liquidity.toString(), stateAB.tick);
	const poolBC: Pool = new Pool(tokenBC[0], tokenBC[1], immutablesBC.fee, stateBC.sqrtPriceX96.toString(), stateBC.liquidity.toString(), stateBC.tick);
	const poolCA: Pool = new Pool(tokenCA[0], tokenCA[1], immutablesCA.fee, stateCA.sqrtPriceX96.toString(), stateCA.liquidity.toString(), stateCA.tick);

	// 8. Get rate from pool
	const [abA, abB] = getTokenRateFromPool(poolAB);
	const [bcB, bcC] = getTokenRateFromPool(poolBC);
	const [caC, caA] = getTokenRateFromPool(poolCA);

	return [
		[abA, abB],
		[bcB, bcC],
		[caC, caA],
	];
};

const getProvider = async (ethereum: ethers.providers.ExternalProvider | ethers.providers.JsonRpcFetchFunc) => {
	return new ethers.providers.Web3Provider(ethereum);
};

/**
 * Create token for A and B in a pool
 *
 * @param immutables
 * @param tokenDetailA
 * @param tokenDetailB
 * @returns
 */
export const createTokens = (immutables, tokenDetailA, tokenDetailB) => {
	const tokenA = new Token(3, immutables.token0, 6, tokenDetailA.ticker, tokenDetailA.name);
	const tokenB = new Token(3, immutables.token1, 18, tokenDetailB.ticker, tokenDetailB.name);

	return [tokenA, tokenB];
};

/**
 * This link here shows how to get the rate of the token swap:
 * ethereum.stackexchange.com/questions/127486/uniswap-v3-fetching-spot-prices-documentation-seems-incomplete?rq=1
 *
 * @param pool
 * @returns
 */
export const getTokenRateFromPool = (pool: Pool) => {
	const token0SwapRate = pool.token0Price.toSignificant(6);
	const token1SwapRate = pool.token1Price.toSignificant(6);

	return [token0SwapRate, token1SwapRate];
};

/**
 * Gets the immutables and state of 3 tokens
 *
 * @param poolContracts
 * @returns
 */
export const getTriangleData = async (poolContracts: ethers.Contract[]) => {
	const [poolContractAB, poolContractBC, poolContractCA] = poolContracts;
	const [immutablesAB, stateAB]: [Immutables, State] = await Promise.all([getPoolImmutables(poolContractAB), getPoolState(poolContractAB)]);
	const [immutablesBC, stateBC]: [Immutables, State] = await Promise.all([getPoolImmutables(poolContractBC), getPoolState(poolContractBC)]);
	const [immutablesCA, stateCA]: [Immutables, State] = await Promise.all([getPoolImmutables(poolContractCA), getPoolState(poolContractCA)]);

	return [
		[immutablesAB, stateAB],
		[immutablesBC, stateBC],
		[immutablesCA, stateCA],
	];
};

/**
 * Get the pool address of 2 tokens
 * @param tokenA
 * @param tokenB
 * @returns
 */
export const getPoolAddress = (tokenA: number, tokenB: number): string => {
	const poolAddressDS = {
		USDC: {
			WETH: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
			BTC: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
		},
		WETH: {
			USDC: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
			BTC: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
		},
		BTC: {
			WETH: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
			USDC: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
		},
	};

	return poolAddressDS[tokenA][tokenB];
};

/**
 * Gets the token details
 *
 * @param token
 * @returns
 */
const getTokenDetail = (token: string) => {
	const tokenDS = {
		WETH: {
			name: "Wrapped Ethereum",
			ticker: "WETH",
			address: "",
		},
		BTC: {
			name: "Bitcoin",
			ticker: "BTC",
			address: "",
		},
		USDC: {
			name: "USD Coin",
			ticker: "USDC",
			address: "",
		},
	};

	return tokenDS[token.toUpperCase()];
};

/**
 * Get the pool state
 *
 * @param poolContract
 * @returns
 */
const getPoolState = async (poolContract: ethers.Contract) => {
	const [liquidity, slot] = await Promise.all([poolContract.liquidity(), poolContract.slot0()]);

	const PoolState: State = {
		liquidity,
		sqrtPriceX96: slot[0],
		tick: slot[1],
		observationIndex: slot[2],
		observationCardinality: slot[3],
		observationCardinalityNext: slot[4],
		feeProtocol: slot[5],
		unlocked: slot[6],
	};

	return PoolState;
};

/**
 * Gets the pool immutables
 *
 * @param poolContract
 * @returns
 */
const getPoolImmutables = async (poolContract: ethers.Contract) => {
	const PoolImmutables: Immutables = {
		factory: await poolContract.factory(),
		token0: await poolContract.token0(),
		token1: await poolContract.token1(),
		fee: await poolContract.fee(),
		tickSpacing: await poolContract.tickSpacing(),
		maxLiquidityPerTick: await poolContract.maxLiquidityPerTick(),
	};

	return PoolImmutables;
};
