// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Minimal Gasless Smart Wallet
contract SmartWallet is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    uint256 public nonce;

    event Executed(address indexed target, uint256 value, bytes data);
    event Received(address indexed sender, uint256 amount);

    constructor(address _owner) Ownable(_owner) {}

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    /**
     * @notice Executes a transaction on behalf of the user, gas paid by relayer (msg.sender).
     * @param target The target contract or address to call.
     * @param value Amount of ETH to send.
     * @param data Calldata for the execution.
     * @param _nonce Nonce to prevent replay attacks.
     * @param signature The signature of the owner authorizing this transaction.
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 _nonce,
        bytes calldata signature
    ) external payable { // Relayer pays gas here
        require(_nonce == nonce, "Invalid nonce");
        
        // 1. Construct the message hash
        // We include chainId and address(this) to prevent replay across chains or other wallets
        bytes32 structHash = keccak256(
            abi.encodePacked(block.chainid, address(this), target, value, data, _nonce)
        );
        
        // 2. Verify signature
        // The user signs the hash of the data. 
        // using version with Ethereum Signed Message prefix to be safe
        bytes32 ethSignedMessageHash = structHash.toEthSignedMessageHash();
        
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == owner(), "Invalid signature");

        // 3. Increment Nonce
        nonce++;

        // 4. Execute
        (bool success, ) = target.call{value: value}(data);
        require(success, "Execution failed");

        emit Executed(target, value, data);
    }
    
    // Allow the owner to execute directly without signature if they have gas
    function executeDirect(address target, uint256 value, bytes calldata data) external onlyOwner {
         (bool success, ) = target.call{value: value}(data);
        require(success, "Execution failed");
        emit Executed(target, value, data);
    }
}
