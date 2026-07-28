#pragma once
#include <cstdint>
#include "xoroshiro128++.h"

enum class Block {
    Bedrock,
    NotBedrock,
    Unknown,
};

class Overworld
{
    public:
        Overworld(int64_t seed);
        ~Overworld();
        Block at(int32_t x, int32_t y, int32_t z);
    private:
        int32_t upper = -59;
        int32_t lower = -64;
        uint64_t rseed0, rseed1;
};