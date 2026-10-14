/**
 * Quicksort Benchmark (Recursive Divide & Conquer)
 * Tests: Branch prediction, recursion overhead, scalar optimization, cache thrashing
 */
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#ifndef DEFAULT_SIZE
#define DEFAULT_SIZE 400000
#endif

void quicksort(int *arr, int low, int high) {
    if (low < high) {
        int pivot = arr[high];
        int i = low - 1;
        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                int temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
        }
        int temp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = temp;
        int pi = i + 1;

        quicksort(arr, low, pi - 1);
        quicksort(arr, pi + 1, high);
    }
}

int main(int argc, char *argv[]) {
    int N = DEFAULT_SIZE;
    if (argc > 1) {
        int parsed = atoi(argv[1]);
        if (parsed > 100 && parsed <= 5000000) N = parsed;
    }

    int *arr = (int *)malloc(N * sizeof(int));
    if (!arr) return 1;

    unsigned int seed = 42;
    for (int i = 0; i < N; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        arr[i] = (int)(seed % 100000);
    }

    struct timespec start, end;
    timespec_get(&start, TIME_UTC);

    quicksort(arr, 0, N - 1);

    timespec_get(&end, TIME_UTC);
    double elapsed_ms = (end.tv_sec - start.tv_sec) * 1000.0 + (end.tv_nsec - start.tv_nsec) / 1000000.0;

    long long checksum = 0;
    for (int i = 0; i < N; i += 97) {
        checksum += arr[i];
    }

    printf("CHECKSUM: %lld\n", checksum);
    printf("EXECUTION_TIME_MS: %.3f\n", elapsed_ms);

    free(arr);
    return 0;
}
