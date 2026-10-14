/**
 * Sieve of Eratosthenes Benchmark (Prime Number Generation)
 * Tests: Memory bandwidth, array stride traversal, conditional jumps, loop invariant code motion
 */
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>
#include <time.h>

#ifndef DEFAULT_LIMIT
#define DEFAULT_LIMIT 2500000
#endif

int main(int argc, char *argv[]) {
    int limit = DEFAULT_LIMIT;
    if (argc > 1) {
        int parsed = atoi(argv[1]);
        if (parsed > 1000 && parsed <= 20000000) limit = parsed;
    }

    bool *is_prime = (bool *)malloc((limit + 1) * sizeof(bool));
    if (!is_prime) return 1;

    struct timespec start, end;
    timespec_get(&start, TIME_UTC);

    memset(is_prime, true, (limit + 1) * sizeof(bool));
    is_prime[0] = false;
    is_prime[1] = false;

    for (int p = 2; p * p <= limit; p++) {
        if (is_prime[p]) {
            for (int i = p * p; i <= limit; i += p) {
                is_prime[i] = false;
            }
        }
    }

    timespec_get(&end, TIME_UTC);
    double elapsed_ms = (end.tv_sec - start.tv_sec) * 1000.0 + (end.tv_nsec - start.tv_nsec) / 1000000.0;

    int count = 0;
    long long sum_primes = 0;
    for (int p = 2; p <= limit; p++) {
        if (is_prime[p]) {
            count++;
            sum_primes += p;
        }
    }

    printf("CHECKSUM: %lld (Count: %d)\n", sum_primes, count);
    printf("EXECUTION_TIME_MS: %.3f\n", elapsed_ms);

    free(is_prime);
    return 0;
}
