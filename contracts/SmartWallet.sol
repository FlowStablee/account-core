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
    ) external payable {
        _executeInner(target, value, data, _nonce, signature);
    }

    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas,
        uint256 _nonce,
        bytes calldata signature
    ) external payable {
        require(_nonce == nonce, "Invalid nonce");
        require(targets.length == values.length && values.length == datas.length, "Length mismatch");

        // 1. Construct the message hash for batch
        bytes32 structHash = keccak256(
            abi.encodePacked(block.chainid, address(this), targets, values, datas, _nonce)
        );

        // 2. Verify signature
        bytes32 ethSignedMessageHash = structHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == owner(), "Invalid signature");

        // 3. Increment Nonce
        nonce++;

        // 4. Execute all
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, ) = targets[i].call{value: values[i]}(datas[i]);
            require(success, "Batch execution failed");
            emit Executed(targets[i], values[i], datas[i]);
        }
    }

    function _executeInner(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 _nonce,
        bytes calldata signature
    ) internal {
        require(_nonce == nonce, "Invalid nonce");
        
        bytes32 structHash = keccak256(
            abi.encodePacked(block.chainid, address(this), target, value, data, _nonce)
        );
        
        bytes32 ethSignedMessageHash = structHash.toEthSignedMessageHash();
        
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == owner(), "Invalid signature");

        nonce++;

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
