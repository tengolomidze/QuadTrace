#include <iostream>
#include <cmath>
#include "legacy.cpp"

using namespace std;

int64_t at(int32_t x, int32_t y, int32_t z) {
    int64_t seed = (int64_t)(x * 3129871)   // 32-bit wrap, then sign-extend
        ^ ((int64_t)z * 116129781L)                 // 64-bit multiply
        ^ (int64_t)y;
    seed = seed * seed * 42317861L + seed * 11L;
    return seed;
}

int32_t getTextureType(int32_t x, int32_t y, int32_t z) {
    Legacy* rnd = new Legacy(at(x, y, z) >> 16);
    return rnd->nextInt(4);
}

int main0() {
    int x0 = 120;
    int z0 = 65;

    for (int z = 65; z <= 68; z++) {
        for (int x = 120; x <= 123; x++) {
            cout << x-x0 << "," << 0 << "," << z-z0 << "," << getTextureType(x, 70, z) << " ";
        }
    }
    cout << endl;

    return 0;
}