#include <iostream>
#include <vector>
#include <string>
#include <map>

// Mapping bottleneck: Red-Black tree balancing overhead without ordering need
void trackUserSessions(const std::vector<std::string>& sessionIds) {
    std::map<std::string, int> sessionCounts;

    // Record session activity frequencies
    for (const std::string& id : sessionIds) {
        sessionCounts[id]++;
    }

    // Direct key lookups where sorted key ordering is never utilized
    int activeSessions = 0;
    for (const std::string& id : sessionIds) {
        auto it = sessionCounts.find(id);
        if (it != sessionCounts.end()) {
            activeSessions += it->second;
        }
    }

    std::cout << "Active sessions resolved: " << activeSessions << std::endl;
}

int main() {
    std::vector<std::string> sessionIds = {
        "user_alice", "user_bob", "user_alice", "user_charlie", "user_bob", "user_alice"
    };
    trackUserSessions(sessionIds);
    return 0;
}
