#include <cstdint>
#include <stdexcept>
#include <vector>

class Legacy {
public:
    // Constructors with initial seed scrambling (same as Java)
    Legacy() : Legacy(5489) {}  // default seed in some Java versions, but any seed works
    explicit Legacy(int64_t seed) {
        setSeed(seed);
    }

    // Set the seed exactly as java.util.Random does
    void setSeed(int64_t seed) {
        // Java: this.seed = (seed ^ multiplier) & mask;
        m_seed = (static_cast<uint64_t>(seed) ^ MULTIPLIER) & MASK;
        m_haveNextNextGaussian = false;
    }

    // Core generator: returns the next 48-bit seed and gives 'bits' random bits
    int32_t next(int bits) {
        uint64_t oldseed = m_seed;
        uint64_t nextseed = (oldseed * MULTIPLIER + ADDEND) & MASK;
        m_seed = nextseed;
        // Java uses unsigned right shift (>>>): (int)(nextseed >>> (48 - bits))
        return static_cast<int32_t>(nextseed >> (48 - bits));
    }

    // Standard public methods
    int32_t nextInt() {
        return next(32);
    }

    int32_t nextInt(int32_t bound) {
        if (bound <= 0)
            throw std::invalid_argument("bound must be positive");

        // If bound is a power of two
        if ((bound & -bound) == bound) {
            return static_cast<int32_t>((static_cast<int64_t>(bound) * next(31)) >> 31);
        }

        // Rejection sampling to avoid bias
        int32_t bits, val;
        do {
            bits = next(31);
            val = bits % bound;
        } while (bits - val + (bound - 1) < 0);
        return val;
    }

    int64_t nextLong() {
        // ( (long)next(32) << 32 ) + next(32)
        return (static_cast<int64_t>(next(32)) << 32) + next(32);
    }

    float nextFloat() {
        return next(24) / (static_cast<float>(1 << 24));
    }

    double nextDouble() {
        // Two 26 and 27 bit parts, scaled by 1/(1L<<53)
        int64_t high = static_cast<int64_t>(next(26)) << 27;
        int64_t low = next(27);
        int64_t val = high + low;
        return val * DOUBLE_UNIT;
    }

    bool nextBoolean() {
        return next(1) != 0;
    }

    void nextBytes(std::vector<uint8_t>& bytes) {
        for (size_t i = 0; i < bytes.size();) {
            int32_t rnd = nextInt();
            for (int n = std::min(bytes.size() - i, size_t(4)); n > 0; --n) {
                bytes[i++] = static_cast<uint8_t>(rnd);
                rnd >>= 8;
            }
        }
    }

private:
    // Constants from java.util.Random
    static constexpr uint64_t MULTIPLIER = 0x5DEECE66DULL;
    static constexpr uint64_t ADDEND = 0xBULL;
    static constexpr uint64_t MASK = (1ULL << 48) - 1;
    static constexpr double   DOUBLE_UNIT = 1.0 / (static_cast<int64_t>(1) << 53);

    uint64_t m_seed;
    bool     m_haveNextNextGaussian = false;  // kept for compatibility, not used here
    // The actual nextGaussian() method is omitted for brevity, but would require
    // a second double stored and the flag above.
};