#include <iostream>
#include <vector>
#include <utility>

// Inefficient sorting bottleneck: pairwise quadratic adjacent element swaps
void bubbleSort(std::vector<int>& records) {
    int n = records.size();
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (records[j] > records[j + 1]) {
                std::swap(records[j], records[j + 1]);
            }
        }
    }
}

int main() {
    std::vector<int> records = {64, 34, 25, 12, 22, 11, 90};
    bubbleSort(records);
    std::cout << "Records sorted via Bubble Sort." << std::endl;
    return 0;
}
