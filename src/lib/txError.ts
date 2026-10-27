import { BaseError, ContractFunctionRevertedError } from 'viem';

/** Plain words for a failed wallet transaction, using the contract's own error names where it has one. */
export function explainTx(e: unknown, words: Record<string, string>): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    const name = revert?.data?.errorName;
    if (name && words[name]) return words[name];
    if (/User rejected|denied/i.test(e.message)) return 'You cancelled in your wallet. Nothing was sent.';
    return e.shortMessage || e.message;
  }
  return e instanceof Error ? e.message : 'Something went wrong.';
}
