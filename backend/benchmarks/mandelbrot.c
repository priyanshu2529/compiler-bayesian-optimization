/**
 * Mandelbrot Fractal Benchmark (Complex Floating-Point Iterations)
 * Tests: Inner-loop floating-point throughput, vectorization, branch prediction, register utilization
 */
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#ifndef DEFAULT_WIDTH
#define DEFAULT_WIDTH 600
#endif
#ifndef DEFAULT_HEIGHT
#define DEFAULT_HEIGHT 600
#endif
#ifndef MAX_ITER
#define MAX_ITER 400
#endif

int main(int argc, char *argv[]) {
    int width = DEFAULT_WIDTH;
    int height = DEFAULT_HEIGHT;
    if (argc > 1) width = atoi(argv[1]);
    if (argc > 2) height = atoi(argv[2]);

    double x_min = -2.0, x_max = 0.5;
    double y_min = -1.25, y_max = 1.25;

    int *output = (int *)malloc(width * height * sizeof(int));
    if (!output) return 1;

    struct timespec start, end;
    timespec_get(&start, TIME_UTC);

    for (int py = 0; py < height; py++) {
        double y0 = y_min + (py / (double)height) * (y_max - y_min);
        for (int px = 0; px < width; px++) {
            double x0 = x_min + (px / (double)width) * (x_max - x_min);
            double x = 0.0, y = 0.0;
            int iter = 0;
            while (x * x + y * y <= 4.0 && iter < MAX_ITER) {
                double xtemp = x * x - y * y + x0;
                y = 2.0 * x * y + y0;
                x = xtemp;
                iter++;
            }
            output[py * width + px] = iter;
        }
    }

    timespec_get(&end, TIME_UTC);
    double elapsed_ms = (end.tv_sec - start.tv_sec) * 1000.0 + (end.tv_nsec - start.tv_nsec) / 1000000.0;

    long long total_iter = 0;
    for (int i = 0; i < width * height; i += 17) {
        total_iter += output[i];
    }

    printf("CHECKSUM: %lld\n", total_iter);
    printf("EXECUTION_TIME_MS: %.3f\n", elapsed_ms);

    free(output);
    return 0;
}
