#include <iostream>
#include <vector>

// Front insertion bottleneck: shifts subsequent elements on every insertion
void processPendingQueue(int totalTasks) {
    std::vector<int> taskQueue;

    // Inserting at index 0 incurs O(N) element displacement per call
    for (int i = 0; i < totalTasks; i++) {
        taskQueue.insert(taskQueue.begin(), i);
    }

    if (!taskQueue.empty()) {
        std::cout << "Front task processed: " << taskQueue.front() << std::endl;
    }
}

int main() {
    processPendingQueue(100);
    return 0;
}
