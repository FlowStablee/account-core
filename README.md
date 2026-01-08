# Gasless Smart Wallet Architecture

## High-Level Architecture

User (EOA/Keypair)
       |
       v
  [Signs Intent]
       |
       v
   Relayer (Off-chain Service)
       |
       v
  [Submits Transaction with Gas]
       |
       v
Smart Contract Wallet (On-chain)
       |
       v
  [Verifies Signature & Nonce]
       |
       v
  [Executes Target Action]

## Transaction Flow

1. **User Intent**: The user selects an action (e.g., send ETH, mint token) on the frontend.
2. **Signing**: The frontend bundles the action details (target, value, data) and a nonce. The user signs this hash using their private key (e.g., via MetaMask signature, not a transaction).
3. **Relaying**: The signed payload is sent to a Relayer API (HTTP endpoint).
4. **Submission**: The Relayer wraps the payload into an Ethereum transaction calling the execute function of the user's Smart Wallet contract. The Relayer pays the gas.
5. **Execution**: The Smart Wallet contract:
    - Verifies the nonce to prevent replay attacks.
    - Recovers the signer address from the signature.
    - Checks if the signer is the authorized owner.
    - If valid, executes the low-level call to the target contract.

## Future-Proofing for Native L1

- **Account Abstraction**: This pattern mirrors EIP-4337. The execute function is analogous to the alidateUserOp and executeUserOp phases.
- **Key Separation**: The signing key is decoupled from the wallet address/account. On a sovereign L1, this logic moves to the protocol level, allowing arbitrary verification logic (e.g., different crypto curves).
- **Paymasters**: Currently, the Relayer pays. In a native L1 or EIP-4337, a Paymaster contract can reimburse the bundler/relayer, allowing for bespoke gas sponsorship models.

