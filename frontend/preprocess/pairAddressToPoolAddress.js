const { tokenPairAddressTest } = require("./tokenPairAddressTest");
const { tokenPair } = require("./tokenPair");
const { tokenDS } = require("./tokenDS");
const { contractAbi } = require("./contractAbi");
const ethers = require("ethers");

// Configure these variables
const factoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const factoryAbi = contractAbi;
const providerUrl =
  "https://mainnet.infura.io/v3/89cd0af4ef3a4501806c55ec05d5a7d7";
// const feeTier = 100; // (0.01% = 100, 0.05% = 500, 0.30% = 3000, 1.00% = 10000)

const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const factoryContract = new ethers.Contract(
  factoryAddress,
  factoryAbi,
  provider
);

async function getPoolAddresses(pairs) {
  const poolAddressDS = {};

  for (const pair of pairs) {
    const [token0, token1] = pair;
    const ticker0 = Object.keys(tokenDS).find((key) =>
      tokenDS[key].address.includes(token0)
    );
    const ticker1 = Object.keys(tokenDS).find((key) =>
      tokenDS[key].address.includes(token1)
    );
    console.log(ticker0);
    console.log(ticker1);

    for (const fee of [100, 500, 3000, 10000]) {
      const poolAddress = await factoryContract.functions.getPool(
        token0,
        token1,
        fee
      );

      if (poolAddress[0] === ethers.constants.AddressZero) {
        continue;
      } else {
        if (!(ticker0 in poolAddressDS)) {
          poolAddressDS[ticker0] = {};
        }
        if (!(ticker1 in poolAddressDS[ticker0])) {
          poolAddressDS[ticker0][ticker1] = {};
        }
        poolAddressDS[ticker0][ticker1][fee] = poolAddress[0];
        console.log(poolAddressDS);
      }
    }
  }
  return poolAddressDS;
}
getPoolAddresses(tokenPairAddressTest).then((poolAddressDS) =>
  console.log(poolAddressDS)
);
