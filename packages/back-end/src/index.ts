import * as dotenv from "dotenv";
import  * as sdk from "@consenlabs/imaccount-sdk";

dotenv.config();

const BUNDLER_URL = process.env.BUNDLER_URL as string;
const ENTRY_POINT_ADDRESS = sdk.ADDRESS.ENTRY_POINT;

async function main() {

  const bundler = new sdk.BundlerProvider({
    url: BUNDLER_URL,
    entryPoint: ENTRY_POINT_ADDRESS,
    mode: sdk.BundlerMode.Auto,
  });
  console.log(await bundler.getChainId());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
