// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SmartWallet.sol";

contract SmartWalletFactory {
    event WalletCreated(address indexed wallet, address indexed owner);

    function createWallet(address _owner) external returns (address) {
        SmartWallet wallet = new SmartWallet(_owner);
        emit WalletCreated(address(wallet), _owner);
        return address(wallet);
    }
    
    // In a real prod app, use CREATE2 for counterfactual addresses
    function createWalletDeterministic(address _owner, bytes32 salt) external returns (address) {
        SmartWallet wallet = new SmartWallet{salt: salt}(_owner);
        emit WalletCreated(address(wallet), _owner);
        return address(wallet);
    }
    
    function getAddress(address _owner, bytes32 salt) external view returns (address) {
         bytes memory bytecode = abi.encodePacked(type(SmartWallet).creationCode, abi.encode(_owner));
         bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );
        return address(uint160(uint256(hash)));
    }
}
