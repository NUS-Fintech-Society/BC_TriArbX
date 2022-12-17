const { tokenPairAddress } = require("./tokenPairAddress");
const { tokenPair } = require("./tokenPair");
const { contractAbi } = require("./contractAbi");
const ethers = require("ethers");

// Configure these variables
const factoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const factoryAbi = contractAbi;
const providerUrl =
  "https://mainnet.infura.io/v3/89cd0af4ef3a4501806c55ec05d5a7d7";
const fee = 100; // 0.3%. This is measured in hundredths of a bip (100, 500, 3000)

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
    const index = pairs.indexOf(pair);
    const tokenPairKey = tokenPair[index];
    // console.log(tokenPairKey);

    try {
      const poolAddress = await factoryContract.functions.getPool(
        token0,
        token1,
        fee
      );

      const key0 = tokenPairKey[0];
      const key1 = tokenPairKey[1];

      if (!(key0 in poolAddressDS)) {
        poolAddressDS[key0] = {};
      }
      poolAddressDS[key0][key1] = poolAddress;
      console.log(poolAddressDS);
    } catch (error) {
      console.error(error);
    }
  }

  return poolAddressDS;
}
getPoolAddresses(tokenPairAddress).then((poolAddressDS) =>
  console.log(poolAddressDS)
);
