#include <bits/stdc++.h>
using namespace std;

// Merge Sort (divide & conquer)
void merge(vector<int>& a,int l,int m,int r){vector<int> L(a.begin()+l,a.begin()+m+1),R(a.begin()+m+1,a.begin()+r+1);int i=0,j=0,k=l;while(i<L.size()&&j<R.size())a[k++]=L[i]<=R[j]?L[i++]:R[j++];while(i<L.size())a[k++]=L[i++];while(j<R.size())a[k++]=R[j++];}
void mergeSort(vector<int>&a,int l,int r){if(l>=r)return;int m=l+(r-l)/2;mergeSort(a,l,m);mergeSort(a,m+1,r);merge(a,l,m,r);}

// Fibonacci DP (memo + tabulation)
long long fibMemo(int n,vector<long long>&memo){if(n<=1)return n;return memo[n]!=-1?memo[n]:memo[n]=fibMemo(n-1,memo)+fibMemo(n-2,memo);} 
long long fibDP(int n){vector<long long>dp(n+2,0);dp[1]=1;for(int i=2;i<=n;++i)dp[i]=dp[i-1]+dp[i-2];return dp[n];}

// Greedy activity selection
struct Act{int s,f;};
vector<Act> greedyAct(vector<Act>v){sort(v.begin(),v.end(),[](auto&a,auto&b){return a.f<b.f;});vector<Act>res;int last=-1;for(auto&a:v)if(a.s>=last){res.push_back(a);last=a.f;}return res;}

// Backtracking N‑Queens
bool safe(const vector<string>&b,int r,int c){for(int i=0;i<r;++i)if(b[i][c]=='Q')return false;for(int i=r-1,j=c-1;i>=0&&j>=0;--i,--j)if(b[i][j]=='Q')return false;for(int i=r-1,j=c+1;i>=0&&j<b.size();--i,++j)if(b[i][j]=='Q')return false;return true;}
void solve(int n,int r,vector<string>&b,vector<vector<string>>&sol){if(r==n){sol.push_back(b);return;}for(int c=0;c<n;++c)if(safe(b,r,c)){b[r][c]='Q';solve(n,r+1,b,sol);b[r][c]='.';}}
vector<vector<string>> nQueens(int n){vector<string>b(n,string(n,'.'));vector<vector<string>>sol;solve(n,0,b,sol);return sol;}

int main(){auto t0=chrono::high_resolution_clock::now();
 // ---------- Data Structure Demo: Vector vs Unordered_Set ----------
    // Create a large collection of integers
    const int DS_SIZE = 100000;
    vector<int> vec;
    vec.reserve(DS_SIZE);
    for(int i=0;i<DS_SIZE;++i) vec.push_back(i*2); // even numbers only
    // Search for a value that does NOT exist (worst‑case linear scan)
    int target = 123457; // odd number, not in vec
    auto vecStart = chrono::high_resolution_clock::now();
    bool foundVec = (find(vec.begin(), vec.end(), target) != vec.end());
    auto vecEnd = chrono::high_resolution_clock::now();
    long long vecTime = chrono::duration_cast<chrono::microseconds>(vecEnd-vecStart).count();
    cout << "Vector search (linear) found=" << foundVec << ", time=" << vecTime << "µs\n";
    // Same search using unordered_set (average O(1))
    unordered_set<int> uset;
    for(int i=0;i<DS_SIZE;++i) uset.insert(i*2);
    auto setStart = chrono::high_resolution_clock::now();
    bool foundSet = (uset.find(target) != uset.end());
    auto setEnd = chrono::high_resolution_clock::now();
    long long setTime = chrono::duration_cast<chrono::microseconds>(setEnd-setStart).count();
    cout << "Unordered_set search (hash) found=" << foundSet << ", time=" << setTime << "µs\n";
    // End of Data Structure Demo

    // merge sort demo
 vector<int> arr={9,4,6,2,7,1,5,3,8};mergeSort(arr,0,arr.size()-1);cout<<"Sorted:";for(int x:arr)cout<<' '<<x;cout<<"\n";
 // fibonacci demo
 int fn=30;vector<long long>memo(fn+1,-1);cout<<"FibMemo("<<fn<<")="<<fibMemo(fn,memo)<<"\n";cout<<"FibDP("<<fn<<")="<<fibDP(fn)<<"\n";
 // greedy demo
 vector<Act>a={{1,4},{3,5},{0,6},{5,7},{3,9},{5,9},{6,10},{8,11},{8,12},{2,14},{12,16}};auto sel=greedyAct(a);cout<<"Activities:";for(auto&x:sel)cout<<'['<<x.s<<','<<x.f<<']';cout<<"\n";
 // backtracking demo
 auto sols=nQueens(4);cout<<"NQueens solutions="<<sols.size()<<"\n";for(auto&s:sols){for(auto&r:s)cout<<r<<"\n";cout<<"---\n";}
 auto t1=chrono::high_resolution_clock::now();
 cout<<"Time:"<<chrono::duration_cast<chrono::milliseconds>(t1-t0).count()<<"ms\n";return 0;}

