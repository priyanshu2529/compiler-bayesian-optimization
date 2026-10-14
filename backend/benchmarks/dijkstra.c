/**
 * Dijkstra Shortest Path Benchmark (Graph Traversal)
 * Tests: Pointer chasing, irregular memory accesses, loop branching, cache latency
 */
#include <stdio.h>
#include <stdlib.h>
#include <limits.h>
#include <time.h>

#ifndef DEFAULT_NODES
#define DEFAULT_NODES 550
#endif

int min_distance(const int *dist, const int *sptSet, int V) {
    int min = INT_MAX, min_index = -1;
    for (int v = 0; v < V; v++) {
        if (!sptSet[v] && dist[v] <= min) {
            min = dist[v];
            min_index = v;
        }
    }
    return min_index;
}

int main(int argc, char *argv[]) {
    int V = DEFAULT_NODES;
    if (argc > 1) {
        int parsed = atoi(argv[1]);
        if (parsed > 10 && parsed <= 2000) V = parsed;
    }

    int *graph = (int *)malloc(V * V * sizeof(int));
    int *dist = (int *)malloc(V * sizeof(int));
    int *sptSet = (int *)malloc(V * sizeof(int));

    if (!graph || !dist || !sptSet) return 1;

    for (int i = 0; i < V; i++) {
        for (int j = 0; j < V; j++) {
            if (i == j) graph[i * V + j] = 0;
            else {
                int w = ((i * 31 + j * 17) % 50);
                graph[i * V + j] = (w < 20) ? (w + 1) : 0;
            }
        }
    }

    struct timespec start, end;
    timespec_get(&start, TIME_UTC);

    // Run Dijkstra from multiple sources to stress graph operations
    int runs = 10;
    long long checksum = 0;
    for (int src = 0; src < runs; src++) {
        for (int i = 0; i < V; i++) {
            dist[i] = INT_MAX;
            sptSet[i] = 0;
        }
        dist[src] = 0;

        for (int count = 0; count < V - 1; count++) {
            int u = min_distance(dist, sptSet, V);
            if (u == -1) break;
            sptSet[u] = 1;

            for (int v = 0; v < V; v++) {
                int weight = graph[u * V + v];
                if (!sptSet[v] && weight && dist[u] != INT_MAX && dist[u] + weight < dist[v]) {
                    dist[v] = dist[u] + weight;
                }
            }
        }

        for (int i = 0; i < V; i++) {
            if (dist[i] != INT_MAX) checksum += dist[i];
        }
    }

    timespec_get(&end, TIME_UTC);
    double elapsed_ms = (end.tv_sec - start.tv_sec) * 1000.0 + (end.tv_nsec - start.tv_nsec) / 1000000.0;

    printf("CHECKSUM: %lld\n", checksum);
    printf("EXECUTION_TIME_MS: %.3f\n", elapsed_ms);

    free(graph);
    free(dist);
    free(sptSet);
    return 0;
}
