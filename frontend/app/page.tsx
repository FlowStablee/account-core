'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function Home() {
    const [account, setAccount] = useState<string>('');
    const [smartWallet, setSmartWallet] = useState<string>('');
    const [target, setTarget] = useState('');
    const [amount, setAmount] = useState('0');
    const [callData, setCallData] = useState('0x');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [signatureResult, setSignatureResult] = useState('');

    // Mock Smart Wallet Address derivation for demo
    const deriveWallet = (owner: string) => {
        // In production, use ethers.getCreate2Address with Factory config
        // Here we just mock it to show the concept
        return "0x" + owner.substring(2).split('').reverse().join('').substring(0, 40);
    };

    const connect = async () => {
        if ((window as any).ethereum) {
            try {
                const provider = new ethers.BrowserProvider((window as any).ethereum);
                const accounts = await provider.send("eth_requestAccounts", []);
                setAccount(accounts[0]);
                setSmartWallet(deriveWallet(accounts[0]));
            } catch (err) {
                console.error(err);
            }
        } else {
            alert("Please install MetaMask");
        }
    };

    const handleSign = async () => {
        try {
            setLoading(true);
            setStatus('Preparing intent...');

            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();

            // 1. Construct Intent (UserOperation)
            // Needs to match SmartWallet.sol: keccak256(abi.encodePacked(chainid, address(this), target, value, data, _nonce))
            const chainId = 31337n; // Example Localhost
            const walletAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Mock Contract Address
            const nonce = 0; // In real app, fetch from contract
            const value = ethers.parseEther(amount);

            // Packing parameters exactly as Solidity does
            // abi.encodePacked strings are raw bytes, so we need to valid hex string for bytes
            const messageHash = ethers.solidityPackedKeccak256(
                ['uint256', 'address', 'address', 'uint256', 'bytes', 'uint256'],
                [chainId, walletAddress, target, value, callData, nonce]
            );

            // 2. User Signs the Hash
            // This is the "Gasless" part: User signs a message, doesn't broadcast a tx
            const signature = await signer.signMessage(ethers.getBytes(messageHash));

            setSignatureResult(signature);
            setStatus('Signed! Sending to Relayer...');

            // 3. Mock Relayer Submission
            await relayTransaction(signature);

        } catch (err: any) {
            setStatus('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const relayTransaction = async (signature: string) => {
        // In a real app, this does: axios.post('https://relayer-api.com/submit', { ...params, signature })
        await new Promise(resolve => setTimeout(resolve, 2000));
        setStatus('Success! Relayer submitted transaction: 0x' + Array(64).fill('a').join('').substring(0, 64));
    };

    return (
        <main className="container">
            <div className="header">
                <h1>Gasless Vault</h1>
                <p className="subtitle">Account Abstraction & Intent Layer</p>
            </div>

            {!account ? (
                <div className="connect-prompt">
                    <button className="btn btn-primary" onClick={connect}>
                        Connect MetaMask
                    </button>
                </div>
            ) : (
                <div className="wallet-card">
                    <div className="form-group">
                        <label className="label">EOA (Signer)</label>
                        <input disabled value={account} />
                    </div>

                    <div className="form-group">
                        <label className="label">Smart Wallet Address (Computed)</label>
                        <input disabled value={smartWallet} style={{ color: 'var(--accent)' }} />
                    </div>

                    <div className="divider"></div>

                    <h3>Create Intent</h3>

                    <div className="form-group">
                        <label className="label">Target Address</label>
                        <input
                            placeholder="0x..."
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Value (ETH)</label>
                        <input
                            type="number"
                            placeholder="0.0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Call Data (Hex)</label>
                        <input
                            placeholder="0x"
                            value={callData}
                            onChange={(e) => setCallData(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={handleSign}
                        disabled={loading || !target}
                    >
                        {loading ? 'Processing...' : 'Sign & Relay (Gasless)'}
                    </button>

                    {status && (
                        <div className={`status ${status.includes('Error') ? 'error' : 'success'}`}>
                            {status}
                        </div>
                    )}

                    {signatureResult && (
                        <div style={{ marginTop: '1rem', overflowWrap: 'break-word', fontSize: '0.7em', color: '#555' }}>
                            <strong>Signature:</strong> {signatureResult}
                        </div>
                    )}

                </div>
            )}
        </main>
    );
}
