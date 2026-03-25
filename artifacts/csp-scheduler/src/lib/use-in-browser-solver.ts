import { useState, useCallback } from "react";
import type { CspResponse } from "@/lib/types";
import { solveCsp, type CspInput } from "./csp-solver";

interface MutateArgs {
  data: CspInput;
}

export function useInBrowserSolver() {
  const [isPending, setIsPending] = useState(false);
  const [data, setData] = useState<CspResponse | undefined>(undefined);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  const reset = useCallback(() => {
    setData(undefined);
    setIsError(false);
    setError(undefined);
    setIsPending(false);
  }, []);

  const mutate = useCallback((args: MutateArgs) => {
    setIsPending(true);
    setData(undefined);
    setIsError(false);
    setError(undefined);

    setTimeout(() => {
      try {
        const result = solveCsp(args.data);
        setData(result);
      } catch (err) {
        setIsError(true);
        setError(err);
      } finally {
        setIsPending(false);
      }
    }, 20);
  }, []);

  return { mutate, isPending, data, isError, error, reset };
}
