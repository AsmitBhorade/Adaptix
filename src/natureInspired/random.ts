/**
 * Seedable Pseudo-Random Number Generator (PRNG)
 * 
 * Uses the Mulberry32 32-bit PRNG algorithm to ensure 100% deterministic,
 * reproducible experiments across runs when the same seed is provided.
 */

export class SeededRandom {
    private state: number;

    constructor(seed: number = 42) {
        this.state = seed >>> 0;
        if (this.state === 0) {
            this.state = 1;
        }
    }

    /** Reset state to a new seed */
    public setSeed(seed: number): void {
        this.state = seed >>> 0;
        if (this.state === 0) {
            this.state = 1;
        }
    }

    /** Generates a pseudo-random 32-bit unsigned integer */
    public nextInt(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (t ^ (t >>> 14)) >>> 0;
    }

    /** Returns a pseudo-random float in [0, 1) */
    public next(): number {
        return this.nextInt() / 4294967296.0;
    }

    /** Returns a pseudo-random float in [min, max) */
    public nextFloat(min: number, max: number): number {
        return min + (max - min) * this.next();
    }

    /** Returns an integer in [min, max] inclusive */
    public nextRangeInt(min: number, max: number): number {
        return Math.floor(this.nextFloat(min, max + 1));
    }

    /** Fisher-Yates array shuffle in-place */
    public shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }

    /** Returns standard normally distributed random number (Box-Muller) */
    public nextGaussian(mean: number = 0, stdDev: number = 1): number {
        let u1 = this.next();
        let u2 = this.next();
        while (u1 <= 1e-15) { u1 = this.next(); } // Avoid log(0)
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
    }
}

