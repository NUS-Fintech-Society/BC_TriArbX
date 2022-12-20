// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

import "../src/TriArbitrage.sol";

// This example swaps DAI/WETH9 for single path swaps and DAI/USDC/WETH9 for multi path swaps.
address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
address constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

// For this example, we will set the pool fee to 0.3%.
uint24 constant poolFee = 3000;

// https://docs.uniswap.org/contracts/v3/reference/deployments
address constant SWAP_ROUTER_ADDRESS = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

contract TriArbitrageTest is Test {
    ISwapRouter SWAP_ROUTER;
    TriArbitrage triArbitrage;

    function setUp() public {
        SWAP_ROUTER = ISwapRouter(SWAP_ROUTER_ADDRESS);
        triArbitrage = new TriArbitrage(SWAP_ROUTER);
    }

    function testExecuteSwap() public {
        address alice = address(1);
        startHoax(alice, 1 ether);

        // necessary to approve deployed contract to spend DAI
        TransferHelper.safeApprove(DAI, address(triArbitrage), 1 ether);

        uint256 amountOut = triArbitrage.executeTriangularArbitrage(
            DAI,
            USDC,
            WETH9,
            1 ether,
            3000
        );

        console.log(amountOut);
        console.log("testExecuteSwap completed.");
    }
}
