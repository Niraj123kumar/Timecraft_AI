import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { CspRequest, CspResponse, ErrorResponse, HealthStatus } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary CSP solver service health check
 */
export declare const getCspHealthUrl: () => string;
export declare const cspHealth: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getCspHealthQueryKey: () => readonly ["/api/csp/health"];
export declare const getCspHealthQueryOptions: <TData = Awaited<ReturnType<typeof cspHealth>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof cspHealth>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof cspHealth>>, TError, TData> & {
    queryKey: QueryKey;
};
export type CspHealthQueryResult = NonNullable<Awaited<ReturnType<typeof cspHealth>>>;
export type CspHealthQueryError = ErrorType<ErrorResponse>;
/**
 * @summary CSP solver service health check
 */
export declare function useCspHealth<TData = Awaited<ReturnType<typeof cspHealth>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof cspHealth>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * Runs the CSP solver using backtracking, forward checking, MRV and degree heuristics to produce valid timetables.
 * @summary Solve a CSP scheduling problem
 */
export declare const getSolveCspUrl: () => string;
export declare const solveCsp: (cspRequest: CspRequest, options?: RequestInit) => Promise<CspResponse>;
export declare const getSolveCspMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof solveCsp>>, TError, {
        data: BodyType<CspRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof solveCsp>>, TError, {
    data: BodyType<CspRequest>;
}, TContext>;
export type SolveCspMutationResult = NonNullable<Awaited<ReturnType<typeof solveCsp>>>;
export type SolveCspMutationBody = BodyType<CspRequest>;
export type SolveCspMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Solve a CSP scheduling problem
 */
export declare const useSolveCsp: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof solveCsp>>, TError, {
        data: BodyType<CspRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof solveCsp>>, TError, {
    data: BodyType<CspRequest>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map