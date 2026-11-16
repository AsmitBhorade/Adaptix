#include <iostream>

// Exponential recursion bottleneck: overlapping subproblems without caching
int fibonacci(int n) {
    if (n <= 0) {
        return 0;
    }
    if (n == 1) {
        return 1;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    int fibVal = fibonacci(10);
    std::cout << "Fibonacci(10) calculated: " << fibVal << std::endl;
    return 0;
}
