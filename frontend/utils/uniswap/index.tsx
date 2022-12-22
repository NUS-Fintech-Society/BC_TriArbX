import { Contract, ethers } from "ethers";
import { Immutables, State, TokenDetail } from "./type";
import { Pool } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { poolAddressDS } from "./store/poolAddressDS";
import { tokenDS } from "./store/tokenDS";
const ERC20 = require("./build/ERC20.json");

/**
 * Returns the arbitrage rate from a token path
 * The link below might be a good reference for getting swap rates
 * https://github.com/Ben-Haslam/Alternative-Uniswap-Interface
 *
 * @param ethereum
 * @param tokenPath
 */
export const getTriangleRate = async (
	ethereum:
		| ethers.providers.ExternalProvider
		| ethers.providers.JsonRpcFetchFunc,
	tokenPath: string[]
) => {
	const provider = await getProvider(ethereum);

	// 1. Get token details
	const tokenDetailA: TokenDetail = await getTokenDetail(
		tokenPath[0],
		ethereum
	);
	const tokenDetailB: TokenDetail = await getTokenDetail(
		tokenPath[1],
		ethereum
	);
	const tokenDetailC: TokenDetail = await getTokenDetail(
		tokenPath[2],
		ethereum
	);
	// console.log("Token Details:", tokenDetailA, tokenDetailB, tokenDetailC);

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
	const poolContractAB: ethers.Contract = new ethers.Contract(
		poolAddressAB,
		IUniswapV3PoolABI,
		provider
	);
	const poolContractBC: ethers.Contract = new ethers.Contract(
		poolAddressBC,
		IUniswapV3PoolABI,
		provider
	);
	const poolContractCA: ethers.Contract = new ethers.Contract(
		poolAddressCA,
		IUniswapV3PoolABI,
		provider
	);
	// console.log("pool Contract:", poolContractAB, poolContractBC, poolContractCA);

	// 4. Query the state and immutable variables of the pool
	const [
		[immutablesAB, stateAB],
		[immutablesBC, stateBC],
		[immutablesCA, stateCA],
	] = await getTriangleData([poolContractAB, poolContractBC, poolContractCA]);

	// 5. Create tokens
	const tokenAB = await createTokens(immutablesAB, tokenDetailA, tokenDetailB);
	const tokenBC = await createTokens(immutablesBC, tokenDetailB, tokenDetailC);
	const tokenCA = await createTokens(immutablesCA, tokenDetailC, tokenDetailA);
	// console.log("Tokens:", tokenAB, tokenBC, tokenCA);

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
	// console.log("Pools:", poolAB, poolBC, poolCA);

	// 7. Get rate from pool
	const [abA, abB] = getTokenRateFromPool(poolAB);
	const [bcB, bcC] = getTokenRateFromPool(poolBC);
	const [caC, caA] = getTokenRateFromPool(poolCA);

	const rateAB = poolAB.token0.address === tokenDetailA.address ? abA : abB;
	const rateBC = poolBC.token0.address === tokenDetailB.address ? bcB : bcC;
	const rateCA = poolCA.token0.address === tokenDetailC.address ? caC : caA;

	const arbitrageRate = rateAB * rateBC * rateCA;

	// console.log(`
	// 	Pool rates:\n
	// 	${tokenAB[0].symbol} - ${tokenAB[1].symbol} Swap fee ${poolAB.fee / 10_000}%:\n
	// 	1 ${tokenAB[0].symbol} = ${abA} ${tokenAB[1].symbol}\n
	// 	1 ${tokenAB[1].symbol} = ${abB} ${tokenAB[0].symbol}\n

	// 	${tokenBC[0].symbol} - ${tokenBC[1].symbol} Swap fee ${poolBC.fee / 10_000}%:\n
	// 	1 ${tokenBC[0].symbol} = ${bcB} ${tokenBC[1].symbol}\n
	// 	1 ${tokenBC[1].symbol} = ${bcC} ${tokenBC[0].symbol}\n

	// 	${tokenCA[0].symbol} - ${tokenCA[1].symbol} Swap fee ${poolCA.fee / 10_000}%:\n
	// 	1 ${tokenCA[0].symbol} = ${caC} ${tokenCA[1].symbol}\n
	// 	1 ${tokenCA[1].symbol} = ${caA} ${tokenCA[0].symbol}\n

	// 	Triangle Arbitrage rate = ${triangleArbitrageRate}
	// `);

	return {
		aTob: rateAB,
		bToc: rateBC,
		cToA: rateCA,
		arbitrageRate: rateAB * rateBC * rateCA,
	};
};

/**
 * Get a provider from window.ethereum object
 *
 * @param ethereum
 * @returns
 */
const getProvider = async (
	ethereum:
		| ethers.providers.ExternalProvider
		| ethers.providers.JsonRpcFetchFunc
) => {
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

	return immutables.token0 === tokenDetailA.address
		? [tokenA, tokenB]
		: [tokenB, tokenA];
};

/**
 * Get the token's decimals
 * @param tokenDetail
 * @returns
 */
const getDecimals = async (tokenDetail: TokenDetail) => {
	return await tokenDetail.contract.decimals();
};

/**
 * This link here shows how to get the rate of the token swap:
 * ethereum.stackexchange.com/questions/127486/uniswap-v3-fetching-spot-prices-documentation-seems-incomplete?rq=1
 *
 * @param pool
 * @returns
 */
export const getTokenRateFromPool = (pool: Pool): number[] => {
	const token0SwapRate: number = parseFloat(pool.token0Price.toSignificant(6)); // Token 0 / Token 1
	const token1SwapRate: number = parseFloat(pool.token1Price.toSignificant(6)); // Token 1 / Token 0

	return [token0SwapRate, token1SwapRate];
};

/**
 * Gets the immutables and state of 3 tokens
 *
 * @param poolContracts
 * @returns
 */
export const getTriangleData = async (
	poolContracts: ethers.Contract[]
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

/**
 * Get the pool address of 2 tokens
 * @param tokenA
 * @param tokenB
 * @returns
 */
export const getPoolFee = (tokenA: string, tokenB: string): string => {
	const fees = Object.keys(poolAddressDS[tokenA][tokenB]);
	const fee = fees.filter((fee) => parseInt(fee) >= 10_000); // checks if there is >= 3 percent]

	if (fee.length) return fee[0];

	return fees[0];
};

/**
 * Get the pool address of 2 tokens
 * @param tokenA
 * @param tokenB
 * @returns
 */
export const getPoolAddress = (tokenA: string, tokenB: string): string => {
	const poolAddressA = poolAddressDS[tokenA];
	if (!poolAddressA)
		throw new Error(tokenA + "-" + tokenB + "pool address does not exist");

	const poolAddressB = poolAddressA[tokenB];

	if (!poolAddressB)
		throw new Error(tokenA + "-" + tokenB + "pool address does not exist");

	const result = poolAddressB[getPoolFee(tokenA, tokenB)];
	return result;
};

/**
 * Gets the token details
 *
 * @param token
 * @returns
 */
const getTokenDetail = async (
	tokenSymbol: string,
	ethereum:
		| ethers.providers.ExternalProvider
		| ethers.providers.JsonRpcFetchFunc
): Promise<TokenDetail> => {
	const provider = await getProvider(ethereum);
	const tokenDetail = tokenDS[tokenSymbol.toUpperCase()];
	const contract = new Contract(tokenDetail.address, ERC20.abi, provider);
	const chainId = (await provider.getNetwork()).chainId;

	return { ...tokenDetail, contract, chainId };
};

/**
 * Get the pool state
 *
 * @param poolContract
 * @returns
 */
const getPoolState = async (poolContract: ethers.Contract) => {
	const [liquidity, slot] = await Promise.all([
		poolContract.liquidity(),
		poolContract.slot0(),
	]);

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
