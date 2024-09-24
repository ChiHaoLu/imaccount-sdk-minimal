import React, { useState, useEffect } from "react";
import {
  ADDRESS,
  AccountEntryFactory,
  imAccount,
  BundlerProvider,
  BundlerMode,
} from "@consenlabs/imaccount-sdk";
import { ethers, Eip1193Provider, BrowserProvider } from "ethers";
import { JsonRpcSignerECDSAValidator } from "./JsonRpcSignerECDSAValidator";

declare global {
  interface Window {
    ethereum: Eip1193Provider & BrowserProvider;
  }
}

const Home = () => {
  const [accountInfo, setAccountInfo] = useState<{
    account: imAccount;
    isDeployed: boolean;
  } | null>(null);
  const [chainID, setChainID] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [bundlerRpcUrl, setBundlerRpcUrl] = useState(
    (process.env.NEXT_PUBLIC_RPC_URL as string) ?? ""
  );
  const [userSalt, setUserSalt] = useState(123);

  const ENTRY_POINT_ADDRESS = ADDRESS.ENTRY_POINT;
  const ECDSA_VALIDATOR_ADDRESS = ADDRESS.SEPOLIA.ecdsaValidator;
  const ACCOUNT_FACTORY_ADDRESS = ADDRESS.SEPOLIA.imAccountFactory;
  const ENTRY_FACTORY_ADDRESS = ADDRESS.SEPOLIA.accountEntryProxyFactory;

  const fetchData = async () => {
    const bundler = new BundlerProvider({
      url: bundlerRpcUrl,
      entryPoint: ENTRY_POINT_ADDRESS,
      mode: BundlerMode.Auto,
    });
    setChainID(Number(await bundler.getChainId()));
  };

  const initAccount = async () => {
    setInitLoading(true);
    const userSaltBigInt = BigInt(userSalt);
    const provider = new ethers.BrowserProvider(window.ethereum);
    const bundler = new BundlerProvider({
      url: bundlerRpcUrl,
      entryPoint: ENTRY_POINT_ADDRESS,
      mode: BundlerMode.Auto,
    });
    const validator = new JsonRpcSignerECDSAValidator({
      rpcUrl: bundlerRpcUrl,
      address: ECDSA_VALIDATOR_ADDRESS,
      owner: await provider.getSigner(),
    });
    try {
      const account = await imAccount.create({
        rpcUrl: bundlerRpcUrl,
        bundler: bundler,
        imAccountFactoryAddress: ACCOUNT_FACTORY_ADDRESS,
        accountEntryFactoryAddress: ENTRY_FACTORY_ADDRESS,
        entryPointAddress: ENTRY_POINT_ADDRESS,
        validator: validator,
        userSalt: userSaltBigInt,
      });
      setAccountInfo({ account, isDeployed: false });
    } catch (error) {
      try {
        const entryFactory = new AccountEntryFactory({
          rpcUrl: bundlerRpcUrl,
          accountEntryFactoryAddress: ENTRY_FACTORY_ADDRESS,
          accountFactoryAddress: ACCOUNT_FACTORY_ADDRESS,
          entryPointAddress: ENTRY_POINT_ADDRESS,
          validator: validator,
          userSalt: userSaltBigInt,
        });
        const account = await imAccount.import({
          rpcUrl: bundlerRpcUrl,
          bundler: bundler,
          entryAddress: await entryFactory.getAddress(),
          validator: validator,
        });
        setAccountInfo({ account, isDeployed: true });
      } catch (error) {
        console.error(error);
      }
    }
    setInitLoading(false);
  };

  useEffect(() => {
    fetchData().catch(console.error);
    initAccount().catch(console.error);
  }, []);

  const handleDeploy = async () => {
    if (accountInfo && !accountInfo.isDeployed) {
      setLoading(true);
      try {
        await accountInfo.account.deploy();
        setAccountInfo({
          ...accountInfo,
          isDeployed: true,
        });
      } catch (error) {
        console.error("Error deploying account:", error);
      }
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Current Chain ID: {chainID}</h1>
      <div>
        <label>
          Alchemy API URL:
          <input
            type="text"
            value={bundlerRpcUrl}
            onChange={(e) => setBundlerRpcUrl(e.target.value)}
            placeholder="https://eth-sepolia.g.alchemy.com/v2/your-api-key"
            required
          />
        </label>
      </div>
      <div>
        <label>
          Salt:
          <input
            type="text"
            value={userSalt}
            onChange={(e) => setUserSalt(Number(e.target.value))}
            required
          />
        </label>
      </div>
      <button onClick={initAccount} disabled={initLoading}>
        {initLoading ? "Loading Account..." : "Load Account"}
      </button>
      {accountInfo ? (
        <div>
          <p>Entry Address: {accountInfo.account.getSenderAddress()}</p>
          <p>Account Address: {accountInfo.account.getAccountsAddress()[0]}</p>
          <p>Is Deployed: {accountInfo.isDeployed ? "Yes" : "No"}</p>
          {/* Show the Deploy button only if the account is not deployed */}
          {!accountInfo.isDeployed && (
            <button onClick={handleDeploy} disabled={loading}>
              {loading
                ? "Deploying..."
                : "Deploy Account (Please deposit 0.07 ETH to your Entry Address before click this button)"}
            </button>
          )}
        </div>
      ) : (
        <p>Loading account details...</p>
      )}
    </div>
  );
};

export default Home;
