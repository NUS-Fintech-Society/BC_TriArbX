const { poolAddressDSno1inch } = require("./poolAddressDSno1inch");
const { tokenDS } = require("./tokenDS");

const triangleDS = [];

for (const tokenA in tokenDS) {
  for (const tokenB in tokenDS) {
    for (const tokenC in tokenDS) {
      if (tokenA === tokenB || tokenB === tokenC || tokenC === tokenA) {
        continue;
      }

      if (
        tokenA in poolAddressDSno1inch &&
        tokenB in poolAddressDSno1inch[tokenA] &&
        tokenB in poolAddressDSno1inch &&
        tokenC in poolAddressDSno1inch[tokenB] &&
        tokenC in poolAddressDSno1inch &&
        tokenA in poolAddressDSno1inch[tokenC]
      ) {
        triangleDS.push([tokenA, tokenB, tokenC]);
      }
    }
  }
}

console.log(triangleDS);

const fs = require("fs");

fs.writeFileSync("triangleDS.txt", JSON.stringify(triangleDS));
