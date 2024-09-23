import React from "react";
import * as sdk from "@consenlabs/imaccount-sdk";

const Home = () => {
  const [chainID, setChainID] = React.useState(0);

  React.useEffect(() => {
    const BUNDLER_URL = process.env.NEXT_PUBLIC_RPC_URL as string;
    const ENTRY_POINT_ADDRESS = sdk.ADDRESS.ENTRY_POINT;

    const fetchData = async () => {
      const bundler = new sdk.BundlerProvider({
        url: BUNDLER_URL,
        entryPoint: ENTRY_POINT_ADDRESS,
        mode: sdk.BundlerMode.Auto,
      });
      setChainID(Number(await bundler.getChainId()));
    };

    fetchData().catch(console.error);
  }, []);

  return (
    <div>
      <h1>
        <>SDK Block Number: {chainID}</>
      </h1>
    </div>
  );
};

export default Home;
