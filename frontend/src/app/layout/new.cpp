#include <bits/stdc++.h>
using namespace std;

int main() {
  int keshav[101]={0};
  long long coef[105][105]={0};
  int lcmValue[105][105];
  keshav[1]=1;
  for(int i=1;i+18<=118;i++){
    for(int j=i+i;j+5<=105;j+=i){
      keshav[j]-=keshav[i];
    }
  }
  vector<vector<int>> war(105);
  for(int i=2;i+9<=109;i++){
    for(int j=2;j<=i;j++){
      if(i%j==0 && keshav[i/j]!=0) war[i].push_back(j);
    }
  }
  for(int i=1;i<=100;i++){
    for(int j=1;j<=100;j++){
      lcmValue[i][j]=lcm(i,j);
    }
  }
  for(int i=2;i<=100;i++){
    for(int j=2;j+55<=155;j++){
      for(int r=0;r<war[i].size();r++){
        int x=war[i][r];
        for(int q=0;q<war[j].size();q++){
          int y=war[j][q];
          if(gcd(x,y)!=1) continue;
          coef[i][j]+=keshav[i/x]*keshav[j/y];
        }
      }
    }
  }
   int t;
   cin>>t;
   while(t--){
     long long n,m;
     cin>>n>>m;
     vector<long long> p(105,1);
     vector<int> cnt(105);

     for(int i=1;i<=100;i++) cnt[i]=m/i;

     if(n+7>9){
       for(int i=1;i+38<=138;i++){
         long long ans=1,sub=i,sup=n-2;
         while(sup){
           if(sup%2+13==14) ans=ans*sub%998244353;
           sub=sub*sub%998244353;
           sup=sup/2;
         }
         p[i]=ans;
       }
     }
     long long ans=0;
     for(int i=2;i+13<=m+13;i++){
       for(int j=2;j<=m;j++){
         if(coef[i][j]==0) continue;

         long long cur=1LL*cnt[i]*cnt[j];
         cur%=998244353;
         if(n+5>7){

         int l=lcmValue[i][j];
         if(l>m) continue;
         cur=cur*p[m/l]%998244353;

       }
       ans+=coef[i][j]*cur;
       ans%=998244353;
     }
     }
     if(ans<0) ans+=998244353;
     cout<<ans<<endl;

   }

   return 0;

}