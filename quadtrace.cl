// quadseach.cl


#pragma OPENCL EXTENSION cl_khr_fp64 : enable

typedef struct __attribute__((packed)) {
    int dx;
    int dy;     
    int dz;
    int expected;
} PatternEntry;


int next(ulong* s, int bits) {
    *s = (*s * 0x5DEECE66DULL + 0xBULL) & ((1UL << 48) - 1);
    return (int)(*s >> (48 - bits));
}

inline int rotation_at(int x, int y, int z) {
    long seed = (long)(int)(x * 3129871)
              ^ ((long)z * 116129781L)
              ^ (long)y;
    seed = seed * seed * 42317861L + seed * 11L;
    seed >>= 16;

    ulong m_seed = ((ulong)seed ^ 0x5DEECE66DULL) & ((1UL << 48) - 1);
    
    int bits = next(&m_seed, 31);
    return (int)(((long)4 * (long)bits) >> 31);
}

__kernel void search_pattern(
    int xBase,
    int yBase,
    int zBase,
    __global const PatternEntry* pattern,
    int patternCount,
    __global int3* outHits,
    __global volatile int* outCount,
    int maxHits
)
{
    int gx = get_global_id(0);
    int gy = get_global_id(1);
    int gz = get_global_id(2);

    int X0 = xBase + gx;
    int Y0 = yBase + gy;
    int Z0 = zBase + gz;

    for (int i = 0; i < patternCount; i++) {
        PatternEntry e = pattern[i];
        int actual = rotation_at(X0 + e.dx, Y0 + e.dy, Z0 + e.dz);

        if (e.expected == 4 && actual != 0 && actual != 2){
            return;
        }
        if (e.expected == 5 && actual != 1 && actual != 3){
            return;
        }
        if (actual != e.expected && e.expected != 4 && e.expected != 5) {
            return;
        }
    }

    int idx = atomic_inc(outCount);
    if (idx < maxHits) {
        outHits[idx] = (int3)(X0, Y0, Z0);
    }
}
