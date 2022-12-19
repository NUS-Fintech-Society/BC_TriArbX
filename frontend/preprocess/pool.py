from web3 import Web3

abi = [{'inputs': [], 'stateMutability': 'nonpayable', 'type': 'constructor'}, {'anonymous': False, 'inputs': [{'indexed': True, 'internalType': 'uint24', 'name': 'fee', 'type': 'uint24'}, {'indexed': True, 'internalType': 'int24', 'name': 'tickSpacing', 'type': 'int24'}], 'name': 'FeeAmountEnabled', 'type': 'event'}, {'anonymous': False, 'inputs': [{'indexed': True, 'internalType': 'address', 'name': 'oldOwner', 'type': 'address'}, {'indexed': True, 'internalType': 'address', 'name': 'newOwner', 'type': 'address'}], 'name': 'OwnerChanged', 'type': 'event'}, {'anonymous': False, 'inputs': [{'indexed': True, 'internalType': 'address', 'name': 'token0', 'type': 'address'}, {'indexed': True, 'internalType': 'address', 'name': 'token1', 'type': 'address'}, {'indexed': True, 'internalType': 'uint24', 'name': 'fee', 'type': 'uint24'}, {'indexed': False, 'internalType': 'int24', 'name': 'tickSpacing', 'type': 'int24'}, {'indexed': False, 'internalType': 'address', 'name': 'pool', 'type': 'address'}], 'name': 'PoolCreated', 'type': 'event'}, {'inputs': [{'internalType': 'address', 'name': 'tokenA', 'type': 'address'}, {'internalType': 'address', 'name': 'tokenB', 'type': 'address'}, {'internalType': 'uint24', 'name': 'fee', 'type': 'uint24'}], 'name': 'createPool', 'outputs': [{'internalType': 'address', 'name': 'pool', 'type': 'address'}], 'stateMutability': 'nonpayable', 'type': 'function'}, {'inputs': [{'internalType': 'uint24', 'name': 'fee', 'type': 'uint24'}, {'internalType': 'int24', 'name': 'tickSpacing', 'type': 'int24'}], 'name': 'enableFeeAmount', 'outputs': [], 'stateMutability': 'nonpayable', 'type': 'function'}, {'inputs': [{'internalType': 'uint24', 'name': '', 'type': 'uint24'}], 'name': 'feeAmountTickSpacing', 'outputs': [{'internalType': 'int24', 'name': '', 'type': 'int24'}], 'stateMutability': 'view', 'type': 'function'}, {'inputs': [{'internalType': 'address', 'name': '', 'type': 'address'}, {'internalType': 'address', 'name': '', 'type': 'address'}, {'internalType': 'uint24', 'name': '', 'type': 'uint24'}], 'name': 'getPool', 'outputs': [{'internalType': 'address', 'name': '', 'type': 'address'}], 'stateMutability': 'view', 'type': 'function'}, {'inputs': [], 'name': 'owner', 'outputs': [{'internalType': 'address', 'name': '', 'type': 'address'}], 'stateMutability': 'view', 'type': 'function'}, {'inputs': [], 'name': 'parameters', 'outputs': [{'internalType': 'address', 'name': 'factory', 'type': 'address'}, {'internalType': 'address', 'name': 'token0', 'type': 'address'}, {'internalType': 'address', 'name': 'token1', 'type': 'address'}, {'internalType': 'uint24', 'name': 'fee', 'type': 'uint24'}, {'internalType': 'int24', 'name': 'tickSpacing', 'type': 'int24'}], 'stateMutability': 'view', 'type': 'function'}, {'inputs': [{'internalType': 'address', 'name': '_owner', 'type': 'address'}], 'name': 'setOwner', 'outputs': [], 'stateMutability': 'nonpayable', 'type': 'function'}]

uni_v3_pool = '0x1F98431c8aD98523631AE4a59f267346ea31F984'

Infura_HTTP = 'https://mainnet.infura.io/v3/89cd0af4ef3a4501806c55ec05d5a7d7'
w3 = Web3(Web3.HTTPProvider(Infura_HTTP))

univ3 = w3.eth.contract(uni_v3_pool, abi=abi)

# USDC
token1 = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" 
# WETH
token2 = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
fee = 5000

# poolAddress 0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640
print(univ3.functions.getPool(token1, token2, fee).call())
