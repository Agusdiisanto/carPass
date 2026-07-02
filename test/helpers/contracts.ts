import assert from "node:assert/strict";
import type { Interface } from "ethers";

type RevertError = Error & {
  data?: string;
  error?: RevertError;
  info?: {
    error?: RevertError;
  };
};

type ContractLike = {
  interface: Interface;
};

function getErrorData(error: unknown): string | undefined {
  const typedError = error as RevertError;
  return (
    typedError.data ??
    typedError.error?.data ??
    typedError.info?.error?.data ??
    typedError.info?.error?.error?.data
  );
}

export async function expectCustomError(
  action: () => Promise<unknown>,
  contract: ContractLike,
  expectedName: string,
  expectedArgs?: readonly unknown[],
) {
  try {
    await action();
  } catch (error) {
    const errorData = getErrorData(error);
    assert.ok(errorData, `Expected ${expectedName}, but revert data was not found`);

    const parsedError = contract.interface.parseError(errorData);
    assert.equal(parsedError?.name, expectedName);
    if (expectedArgs !== undefined) {
      assert.deepEqual([...parsedError!.args], [...expectedArgs]);
    }
    return;
  }

  assert.fail(`Expected ${expectedName} revert`);
}
