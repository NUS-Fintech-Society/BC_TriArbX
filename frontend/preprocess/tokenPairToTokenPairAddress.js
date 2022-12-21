const { tokenDS } = require("./tokenDS");
const { tokenPair } = require("./tokenPair");

const tokenPairAddress = tokenPair.map(([token0, token1]) => [
  tokenDS[token0].address,
  tokenDS[token1].address,
]);

console.log(tokenPairAddress);

const fs = require("fs");

fs.writeFileSync("tokenPairAddress.txt", JSON.stringify(tokenPairAddress));
