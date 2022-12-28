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
     * @dev The calling address must approve this contract to spend at least `amountIn` worth of its tokenA for this function to succeed.
     * @params array of tokenA / tokenB / tokenC
     * @params array of poolFees of pool AB / BC / CA. The fee for the a pool in hundredths of basis points. E.g. 3000 = 0.3% fee
     * @params amountIn The amount that caller want to use
     * @returns the output amount
     */
    function executeTriangularArbitrage(
        address[3] memory tokens,
        uint24[3] memory poolFees,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        // Checks input parameters
        require(
            tokens.length == 3 && poolFees.length == 3,
            "Invalid length of tokens / pool fees."
        );
        require(amountIn > 0, "Invalid amount in.");

        // Check sender tokenA balance
        require(
            IERC20(tokens[0]).balanceOf(msg.sender) >= amountIn,
            "Insufficient funds available."
        );

        // Transfer `amountIn` of tokenA to this contract.
        TransferHelper.safeTransferFrom(
            tokens[0],
            msg.sender,
            address(this),
            amountIn
        );

        // Approve the router to spend tokenA.
        TransferHelper.safeApprove(tokens[0], address(swapRouter), amountIn);

        // tokenA => tokenB => tokenC => tokenA
        ISwapRouter.ExactInputParams memory params = ISwapRouter
            .ExactInputParams({
                path: abi.encodePacked(
                    tokens[0],
                    poolFees[0],
                    tokens[1],
                    poolFees[1],
                    tokens[2],
                    poolFees[2],
                    tokens[0]
                ),
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0
            });

        // Executes the swap.
        amountOut = swapRouter.exactInput(params);

        // Checks if swap is profitable.
        require(amountOut >= amountIn, "Swap would have incurred losses.");

        return amountOut;
    }
}
