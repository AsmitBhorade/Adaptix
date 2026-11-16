#include <iostream>
#include <string>

// String matching bottleneck: nested loops causing O(N * M) worst-case comparisons
int findSubstringPattern(const std::string& text, const std::string& pattern) {
    int n = text.length();
    int m = pattern.length();

    // Naive verification re-evaluates characters on mismatch without prefix memory
    for (int i = 0; i <= n - m; i++) {
        int j = 0;
        while (j < m && text[i + j] == pattern[j]) {
            j++;
        }
        if (j == m) {
            return i;
        }
    }
    return -1;
}

int main() {
    std::string text = "CAMPUS_DISPATCH_ORDER_CONFIRMED";
    std::string pattern = "ORDER";
    int matchIndex = findSubstringPattern(text, pattern);
    std::cout << "Pattern found at character offset: " << matchIndex << std::endl;
    return 0;
}
