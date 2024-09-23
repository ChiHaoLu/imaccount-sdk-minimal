import React, { useState, useEffect } from "react";
import * as sdk from "@consenlabs/imaccount-sdk";
import { ethers, Eip1193Provider, BrowserProvider } from "ethers";
import { JsonRpcSignerECDSAValidator } from "./JsonRpcSignerECDSAValidator";

declare global {
  interface Window {
    ethereum: Eip1193Provider & BrowserProvider;
  }
}

const Home = () => {
  const [accountInfo, setAccountInfo] = useState<{
    account: sdk.imAccount;
    isDeployed: boolean;
  } | null>(null);
  const [chainID, setChainID] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL as string;
    const ENTRY_POINT_ADDRESS = sdk.ADDRESS.ENTRY_POINT;
    const ECDSA_VALIDATOR_ADDRESS = sdk.ADDRESS.SEPOLIA.ecdsaValidator;
    const ACCOUNT_FACTORY_ADDRESS = sdk.ADDRESS.SEPOLIA.imAccountFactory;
    const ENTRY_FACTORY_ADDRESS = sdk.ADDRESS.SEPOLIA.accountEntryProxyFactory;
    const USER_SALT = 123n;

    const fetchData = async () => {
      const bundler = new sdk.BundlerProvider({
        url: RPC_URL,
        entryPoint: ENTRY_POINT_ADDRESS,
        mode: sdk.BundlerMode.Auto,
      });
      setChainID(Number(await bundler.getChainId()));
    };
    fetchData().catch(console.error);

    const initAccount = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const bundler = new sdk.BundlerProvider({
          url: RPC_URL,
          entryPoint: ENTRY_POINT_ADDRESS,
          mode: sdk.BundlerMode.Auto,
        });
        const validator = new JsonRpcSignerECDSAValidator({
          rpcUrl: RPC_URL,
          address: ECDSA_VALIDATOR_ADDRESS,
          owner: await provider.getSigner(),
        });
        let account: sdk.imAccount;
        if (!accountInfo || !accountInfo.isDeployed) {
          account = await sdk.imAccount.create({
            rpcUrl: RPC_URL,
            bundler: bundler,
            imAccountFactoryAddress: ACCOUNT_FACTORY_ADDRESS,
            accountEntryFactoryAddress: ENTRY_FACTORY_ADDRESS,
            entryPointAddress: ENTRY_POINT_ADDRESS,
            validator: validator,
            userSalt: USER_SALT,
          });
          setAccountInfo({ account, isDeployed: false });
        } else {
          account = await sdk.imAccount.import({
            rpcUrl: RPC_URL,
            bundler: bundler,
            entryAddress: accountInfo.account.getSenderAddress(),
            validator: validator,
          });
        }
      } catch (error) {
        console.error(error);
      }
    };
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
      <h1>SDK Block Number: {chainID}</h1>
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
                : "Deploy Account (Pls deposit 0.05 ETH to your Entry Address first)"}
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
