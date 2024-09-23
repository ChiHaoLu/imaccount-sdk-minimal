import {
  imAccount,
  ValidatorType,
  ECDSAValidatorMetadata,
  getPublicClient,
  DUMMY_ECDSA_SIGNATURE,
  type ECDSAValidatorContractType,
  type Validator,
} from "@consenlabs/imaccount-sdk";
import * as ethers from "ethers";
import {
  Address,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  getAddress,
  getContract,
  Hex,
  isHex,
  keccak256,
  toHex,
} from "viem";

export class JsonRpcSignerECDSAValidator implements Validator {
  private owner: ethers.JsonRpcSigner;
  public type = ValidatorType.ECDSAValidator;
  public contract: ECDSAValidatorContractType;

  public constructor(opts: {
    rpcUrl: string;
    address: Address;
    owner: ethers.JsonRpcSigner;
  }) {
    this.owner = opts.owner;
    this.contract = getContract({
      address: opts.address,
      abi: ECDSAValidatorMetadata.abi,
      client: getPublicClient(opts.rpcUrl),
    }) as ECDSAValidatorContractType;
  }

  public async getDummySignature(): Promise<Hex> {
    return encodePacked(
      ["address", "bytes"],
      [this.contract.address, DUMMY_ECDSA_SIGNATURE]
    );
  }

  public async sign(message: string): Promise<Hex> {
    if (typeof message == "string" && !isHex(message)) {
      message = toHex(message, { size: 32 });
    }
    const digest = keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "address" }],
        [message as Hex, this.contract.address]
      )
    );
    const rawSignature = ethers.Signature.from(
      await this.owner.signMessage(ethers.getBytes(digest))
    );
    const signature = encodePacked(
      ["bytes32", "bytes32", "uint8"],
      [rawSignature.r as Hex, rawSignature.s as Hex, rawSignature.v]
    );
    return encodePacked(
      ["address", "bytes"],
      [this.contract.address, signature]
    );
  }

  public async changeOwner(
    account: imAccount,
    newOwner: ethers.JsonRpcSigner
  ): Promise<void> {
    const setOwnerCalldata = this.getSetOwnerCallData(
      newOwner.address as Address
    );
    const callData = account.getSenderCalldata([
      {
        to: this.getAddress(),
        value: 0n,
        data: setOwnerCalldata,
      },
    ]);
    await account.send("0x", callData);
    this.owner = newOwner;
  }

  public async getOwner(account: Address): Promise<Address> {
    const owner = await this.contract.read.getOwner([account]);
    return owner as Address;
  }

  public getAddress(): Address {
    return getAddress(this.contract.address);
  }

  public getValidatorInitData(): Hex {
    return encodeAbiParameters(
      [{ name: "owner", type: "address" }],
      [this.owner.address as Address]
    );
  }

  public getSetOwnerCallData(newOwnerAddress: Address) {
    return encodeFunctionData({
      abi: ECDSAValidatorMetadata.abi,
      functionName: "setOwner",
      args: [newOwnerAddress],
    });
  }
}
