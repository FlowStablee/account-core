'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function Home() {
    const [account, setAccount] = useState<string>('');
    const [smartWallet, setSmartWallet] = useState<string>('');

    // Auth Mode State
    const [authMode, setAuthMode] = useState<'metamask' | 'email'>('metamask');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localWallet, setLocalWallet] = useState<ethers.Wallet | null>(null);

    // Transaction State
    const [target, setTarget] = useState('');
    const [amount, setAmount] = useState('0');
    const [callData, setCallData] = useState('0x');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [signatureResult, setSignatureResult] = useState('');

    // Mock Smart Wallet Address derivation
    const deriveWallet = (owner: string) => {
        return "0x" + owner.substring(2).split('').reverse().join('').substring(0, 40);
    };

    const connectMetaMask = async () => {
        if ((window as any).ethereum) {
            try {
                const provider = new ethers.BrowserProvider((window as any).ethereum);
                const accounts = await provider.send("eth_requestAccounts", []);
                setAccount(accounts[0]);
                setSmartWallet(deriveWallet(accounts[0]));
                setLocalWallet(null); // Clear local wallet if Metamask used
            } catch (err) {
                console.error(err);
            }
        } else {
            alert("Please install MetaMask");
        }
    };

    const connectEmail = async () => {
        if (!email || !password) return alert("Enter email and password");
        setLoading(true);
        setStatus("Deriving key from password...");

        // INTENTIONALLY INSECURE FOR DEMO ONLY
        // In prod: Use proper Scrypt/Argon2 or simple random generation + encryption
        // Here we use PBKDF2 to Deterministically generate a key from Email+Pass
        // So if you login again, you get the same wallet
        try {
            const passwordBytes = ethers.toUtf8Bytes(password);
            const saltBytes = ethers.toUtf8Bytes(email);

            // PBKDF2 to scramble password into a seed
            // This is a blocking operation, might freeze UI for a split second
            const seed = ethers.pbkdf2(passwordBytes, saltBytes, 1000, 32, "sha256");

            const wallet = new ethers.Wallet(seed);
            setLocalWallet(wallet);
            setAccount(wallet.address);
            setSmartWallet(deriveWallet(wallet.address));
            setStatus("Wallet generated from credentials!");
        } catch (e: any) {
            setStatus("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async () => {
        try {
            setLoading(true);
            setStatus('Preparing intent...');

            // 1. Construct Intent Logic (Same for both)
            const chainId = 31337n;
            const walletAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
            const nonce = 0;
            const value = ethers.parseEther(amount);

            const messageHash = ethers.solidityPackedKeccak256(
                ['uint256', 'address', 'address', 'uint256', 'bytes', 'uint256'],
                [chainId, walletAddress, target, value, callData, nonce]
            );

            let signature = "";

            // 2. Sign based on Auth Mode
            if (localWallet) {
                // Signing with Email-derived key (No Popup!)
                signature = await localWallet.signMessage(ethers.getBytes(messageHash));
            } else {
                // Signing with MetaMask (Popup)
                const provider = new ethers.BrowserProvider((window as any).ethereum);
                const signer = await provider.getSigner();
                signature = await signer.signMessage(ethers.getBytes(messageHash));
            }

            setSignatureResult(signature);
            setStatus('Signed! Sending to Relayer...');

            // 3. Relay
            await relayTransaction(signature);

        } catch (err: any) {
            setStatus('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const relayTransaction = async (signature: string) => {
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
                <div className="wallet-card">
                    <h3>Login Method</h3>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <button
                            className={`btn ${authMode === 'metamask' ? 'btn-primary' : ''}`}
                            style={{ background: authMode !== 'metamask' ? '#222' : undefined }}
                            onClick={() => setAuthMode('metamask')}
                        >
                            MetaMask
                        </button>
                        <button
                            className={`btn ${authMode === 'email' ? 'btn-primary' : ''}`}
                            style={{ background: authMode !== 'email' ? '#222' : undefined }}
                            onClick={() => setAuthMode('email')}
                        >
                            Email / Password
                        </button>
                    </div>

                    {authMode === 'metamask' ? (
                        <button className="btn btn-primary" onClick={connectMetaMask}>
                            Connect MetaMask
                        </button>
                    ) : (
                        <>
                            <div className="form-group">
                                <label className="label">Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="label">Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                            </div>
                            <button className="btn btn-primary" onClick={connectEmail}>
                                Login / Create Wallet
                            </button>
                        </>
                    )}
                    {status && <div className="status">{status}</div>}
                </div>
            ) : (
                <div className="wallet-card">
                    <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                        <button
                            style={{ background: 'transparent', border: '1px solid #333', padding: '5px 10px', color: '#666', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => { setAccount(''); setLocalWallet(null); window.location.reload(); }}
                        >
                            Disconnect
                        </button>
                    </div>

                    <div className="form-group">
                        <label className="label">Signer ({localWallet ? 'Email Key' : 'MetaMask'})</label>
                        <input disabled value={account} />
                    </div>

                    <div className="form-group">
                        <label className="label">Smart Wallet Address</label>
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

                    <button
                        className="btn btn-primary"
                        onClick={handleSign}
                        disabled={loading || !target}
                    >
                        {loading ? 'Processing...' : (localWallet ? 'Auto-Sign & Relay' : 'Sign & Relay')}
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
