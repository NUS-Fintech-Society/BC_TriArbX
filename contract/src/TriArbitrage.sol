// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TriArbitrage is Ownable {
    ISwapRouter public immutable swapRouter;

    // Swap router can be found here: https://docs.uniswap.org/contracts/v3/reference/deployments
    constructor(ISwapRouter _swapRouter) {
        swapRouter = _swapRouter;
    }

    /*
     * Function executes triangular arbitrage
     * @params tokenA
     * @params tokenB
     * @params tokenC
     * @params amountIn The amount that caller want to use
     * @params poolFee The fee for the a pool in hundredths of basis points. E.g. 3000 = 0.3% fee
     * @returns the output amount
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 poolFee
    ) external returns (uint256 amountOut) {
        // Checks if caller has sufficient amount
        require(msg.sender.balance >= amountIn, "Insufficient funds");

        // Transfer `amountIn` of tokenA to this contract.
        TransferHelper.safeTransferFrom(
            tokenA,
            msg.sender,
            address(this),
            amountIn
        );

        // Approve the router to spend tokenA.
        TransferHelper.safeApprove(tokenA, address(swapRouter), amountIn);

        // tokenA => tokenB => tokenC => tokenA
        ISwapRouter.ExactInputParams memory params = ISwapRouter
            .ExactInputParams({
                path: abi.encodePacked(
                    tokenA,
                    poolFee,
                    tokenB,
                    poolFee,
                    tokenC,
                    poolFee,
                    tokenA
                ),
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0
            });

        // Executes the swap.
        amountOut = swapRouter.exactInput(params);

        // Checks if swap is profitable
        require(amountOut >= amountIn, "Swap would have incurred losses");

        return amountOut;
    }
}
