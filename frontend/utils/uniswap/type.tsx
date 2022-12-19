import { ethers } from "ethers";

export interface Immutables {
	factory: string;
	token0: string;
	token1: string;
	fee: number;
	tickSpacing: number;
	maxLiquidityPerTick: number;
}

export interface State {
	liquidity: ethers.BigNumber;
	sqrtPriceX96: ethers.BigNumber;
	tick: number;
	observationIndex: number;
	observationCardinality: number;
	observationCardinalityNext: number;
	feeProtocol: number;
	unlocked: boolean;
}
