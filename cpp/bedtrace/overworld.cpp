#include <cstdint>
#include <stdfloat>
#include "xoroshiro128++.h"
#include "overworld.h"
#include <iostream>
#include <utility>

double inline normalize(double x, double a, double b) {
    return (x - a) / (b - a);
}

Overworld::Overworld(int64_t seed)
{
    Xoroshiro world(seed, "minecraft:bedrock_floor"); // hash-seeded "world" random
    std::pair<uint64_t, uint64_t> seeds = world.state();
    rseed0 = seeds.first;
    rseed1 = seeds.second;
}

Overworld::~Overworld()
{}

Block Overworld::at(int32_t x, int32_t y, int32_t z)
{
    if (y <= lower) return Block::Bedrock;
    if (y >= upper) return Block::NotBedrock;

    double f = 1.0 - normalize(y, lower, upper);

    int64_t seed = (int64_t)(int32_t)(x * 3129871)          // 32-bit wrap, then sign-extend
        ^ ((int64_t)z * 116129781LL)                // correct constant, 64-bit multiply
        ^ (int64_t)y;
    seed = seed * seed * 42317861LL + seed * 0xbLL;
    seed >>= 16;

    Xoroshiro r = Xoroshiro::fromRaw((uint64_t)seed ^ rseed0, rseed1);

    return (r.nextFloat() < f) ? Block::Bedrock : Block::NotBedrock;
}