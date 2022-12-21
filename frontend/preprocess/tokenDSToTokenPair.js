const _ = require("lodash");
const { tokenDS } = require("./tokenDS");

const len = Object.keys(tokenDS).length;
let tokenNames = [];

for (let token0 in tokenDS) {
  for (let token1 in tokenDS) {
    tokenNames.push([token0, token1]);
  }
}

console.log(tokenNames);

const fs = require("fs");

fs.writeFileSync("tokenPair.txt", JSON.stringify(tokenNames));
