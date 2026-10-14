/**
 * N-Body Simulation Benchmark (Gravitational Force Calculation)
 * Tests: Floating point vectorization, loop unrolling, fused multiply-add, instruction pipelining
 */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <time.h>

#ifndef DEFAULT_BODIES
#define DEFAULT_BODIES 1200
#endif
#ifndef DEFAULT_STEPS
#define DEFAULT_STEPS 15
#endif

typedef struct {
    double x, y, z;
    double vx, vy, vz;
    double mass;
} Body;

int main(int argc, char *argv[]) {
    int n_bodies = DEFAULT_BODIES;
    int steps = DEFAULT_STEPS;
    if (argc > 1) n_bodies = atoi(argv[1]);
    if (argc > 2) steps = atoi(argv[2]);

    Body *bodies = (Body *)malloc(n_bodies * sizeof(Body));
    if (!bodies) return 1;

    for (int i = 0; i < n_bodies; i++) {
        bodies[i].x = ((double)(i * 37 % 1000)) / 100.0;
        bodies[i].y = ((double)(i * 41 % 1000)) / 100.0;
        bodies[i].z = ((double)(i * 43 % 1000)) / 100.0;
        bodies[i].vx = 0.0;
        bodies[i].vy = 0.0;
        bodies[i].vz = 0.0;
        bodies[i].mass = 1.0 + (double)(i % 10);
    }

    const double G = 6.67430e-11;
    const double dt = 0.01;
    const double eps = 1e-9;

    struct timespec start, end;
    timespec_get(&start, TIME_UTC);

    for (int s = 0; s < steps; s++) {
        for (int i = 0; i < n_bodies; i++) {
            double fx = 0.0, fy = 0.0, fz = 0.0;
            for (int j = 0; j < n_bodies; j++) {
                if (i == j) continue;
                double dx = bodies[j].x - bodies[i].x;
                double dy = bodies[j].y - bodies[i].y;
                double dz = bodies[j].z - bodies[i].z;
                double dist_sq = dx * dx + dy * dy + dz * dz + eps;
                double dist = sqrt(dist_sq);
                double f = (G * bodies[i].mass * bodies[j].mass) / (dist_sq * dist);
                fx += f * dx;
                fy += f * dy;
                fz += f * dz;
            }
            bodies[i].vx += (fx / bodies[i].mass) * dt;
            bodies[i].vy += (fy / bodies[i].mass) * dt;
            bodies[i].vz += (fz / bodies[i].mass) * dt;
        }

        for (int i = 0; i < n_bodies; i++) {
            bodies[i].x += bodies[i].vx * dt;
            bodies[i].y += bodies[i].vy * dt;
            bodies[i].z += bodies[i].vz * dt;
        }
    }

    timespec_get(&end, TIME_UTC);
    double elapsed_ms = (end.tv_sec - start.tv_sec) * 1000.0 + (end.tv_nsec - start.tv_nsec) / 1000000.0;

    double energy = 0.0;
    for (int i = 0; i < n_bodies; i++) {
        energy += 0.5 * bodies[i].mass * (bodies[i].vx * bodies[i].vx + bodies[i].vy * bodies[i].vy + bodies[i].vz * bodies[i].vz);
    }

    printf("CHECKSUM: %.6e\n", energy);
    printf("EXECUTION_TIME_MS: %.3f\n", elapsed_ms);

    free(bodies);
    return 0;
}
