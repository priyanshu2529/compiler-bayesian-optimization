/**
 * Matrix Multiplication Benchmark (Dense Linear Algebra)
 * Tests: Loop interchange, vectorization, cache tiling, register allocation
 */
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#ifndef DEFAULT_N
#define DEFAULT_N 280
#endif

int main(int argc, char *argv[]) {
    int N = DEFAULT_N;
    if (argc > 1) {
        int parsed = atoi(argv[1]);
        if (parsed > 10 && parsed <= 1000) N = parsed;
    }

    double *A = (double *)malloc(N * N * sizeof(double));
    double *B = (double *)malloc(N * N * sizeof(double));
    double *C = (double *)calloc(N * N, sizeof(double));

    if (!A || !B || !C) {
        fprintf(stderr, "Allocation failed\n");
        return 1;
    }

    for (int i = 0; i < N * N; i++) {
        A[i] = (double)(i % 17) * 0.1;
        B[i] = (double)(i % 13) * 0.1;
    }

    struct timespec start, end;
    timespec_get(&start, TIME_UTC);

    for (int i = 0; i < N; i++) {
        for (int k = 0; k < N; k++) {
            double r = A[i * N + k];
            for (int j = 0; j < N; j++) {
                C[i * N + j] += r * B[k * N + j];
            }
        }
    }

    timespec_get(&end, TIME_UTC);
    double elapsed_ms = (end.tv_sec - start.tv_sec) * 1000.0 + (end.tv_nsec - start.tv_nsec) / 1000000.0;

    double checksum = 0.0;
    for (int i = 0; i < N * N; i += N + 1) {
        checksum += C[i];
    }

    printf("CHECKSUM: %.4f\n", checksum);
    printf("EXECUTION_TIME_MS: %.3f\n", elapsed_ms);

    free(A);
    free(B);
    free(C);
    return 0;
}
