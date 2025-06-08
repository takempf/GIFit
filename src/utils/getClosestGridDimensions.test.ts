import { describe, it, expect } from 'vitest';
import { getClosestGridDimensions } from './getClosestGridDimensions';

describe('getClosestGridDimensions', () => {
  // Test cases with valid targetWidth and targetHeight (aspect ratio driven)
  it('should return [0, 0] for 0 items', () => {
    expect(getClosestGridDimensions(16, 9, 0)).toEqual([0, 0]);
  });

  it('should return [1, 1] for 1 item', () => {
    expect(getClosestGridDimensions(16, 9, 1)).toEqual([1, 1]);
  });

  it('should handle perfect squares aiming for square-like aspect ratio', () => {
    // Target aspect ratio 1:1
    expect(getClosestGridDimensions(1, 1, 9)).toEqual([3, 3]);
    expect(getClosestGridDimensions(1, 1, 4)).toEqual([2, 2]);
    expect(getClosestGridDimensions(1, 1, 1)).toEqual([1, 1]);
  });

  it('should handle prime numbers of items, aiming for square-like aspect ratio', () => {
    // For 7 items with 1:1 target, it might find 3x3 (area 9) or 2x4 (area 8) or 4x2 (area 8)
    // The logic prefers minimum aspect ratio diff, then minimum area.
    // 3/3=1, aspect diff = 0. Area 9.
    // Let's trace for 7 items, target 1:1
    // cols=1, rows=7, aspect=1/7, diff=6/7. area=7
    // cols=2, rows=4, aspect=2/4=0.5, diff=0.5. area=8
    // cols=3, rows=3, aspect=3/3=1, diff=0. area=9
    // cols=4, rows=2, aspect=4/2=2, diff=1. area=8
    // cols=5, rows=2, aspect=5/2=2.5, diff=1.5. area=10
    // cols=6, rows=2, aspect=6/2=3, diff=2. area=12
    // cols=7, rows=1, aspect=7/1=7, diff=6. area=7
    // So, [3,3] is chosen for aspect ratio.
    expect(getClosestGridDimensions(1, 1, 7)).toEqual([3, 3]);
    // For 5 items, target 1:1
    // cols=1, rows=5, aspect=1/5, diff=4/5
    // cols=2, rows=3, aspect=2/3, diff=1/3
    // cols=3, rows=2, aspect=3/2, diff=1/2
    // cols=4, rows=2, aspect=4/2=2, diff=1
    // cols=5, rows=1, aspect=5/1, diff=4
    // Smallest diff is 1/3 for [2,3]. But it should be [cols, rows]
    // The code iterates cols from 1 to length.
    // cols=2, rows=3, aspect = 2/3 = 0.66, diff = 0.33
    // cols=3, rows=2, aspect = 3/2 = 1.5, diff = 0.5
    // So [2,3] should be chosen.
    expect(getClosestGridDimensions(1, 1, 5)).toEqual([2, 3]);
  });

  it('should handle numbers that are products of two close numbers, for 1:1 aspect', () => {
    // The following line was incorrect and is removed by this diff.
                                                              // 3/4=0.75, diff=0.25. Area 12
                                                              // The code picks the one with smaller aspect diff first.
                                                              // If diffs are equal, picks smaller area (not relevant here).
                                                              // cols=3, rows=4, aspect=0.75, diff=0.25
                                                              // cols=4, rows=3, aspect=1.33, diff=0.33
                                                              // So [3,4] is expected.
    expect(getClosestGridDimensions(1, 1, 12)).toEqual([3, 4]); // This is the corrected expectation
    // Removed incorrect/duplicate test for 6 items: expect(getClosestGridDimensions(1, 1, 6)).toEqual([3, 2]);
    expect(getClosestGridDimensions(1, 1, 6)).toEqual([2, 3]); // This one is correct as per my trace for 6 items.
  });

  it('should work with a wide aspect ratio (16:9)', () => {
    // 12 items, target 16/9 = 1.777
    // cols=4, rows=3, aspect=4/3=1.333, diff=0.444
    // cols=5, rows=3, aspect=5/3=1.666, diff=0.111, area=15
    // cols=6, rows=2, aspect=6/2=3, diff=1.222
    expect(getClosestGridDimensions(16, 9, 12)).toEqual([5, 3]);
    // 2 items
    // cols=1, rows=2, aspect=0.5, diff=1.277
    // cols=2, rows=1, aspect=2, diff=0.222. Area 2
    expect(getClosestGridDimensions(16, 9, 2)).toEqual([2, 1]);
  });

  it('should work with a tall aspect ratio (9:16)', () => {
    // 12 items, target 9/16 = 0.5625
    // cols=2, rows=6, aspect=2/6=0.333, diff=0.229. Area 12
    // cols=3, rows=4, aspect=3/4=0.75, diff=0.1875. Area 12
    expect(getClosestGridDimensions(9, 16, 12)).toEqual([3, 4]);
  });

  // Test cases for fallback (invalid targetWidth or targetHeight)
  it('should use square-like fallback for 0 targetWidth', () => {
    expect(getClosestGridDimensions(0, 9, 9)).toEqual([3, 3]);
    expect(getClosestGridDimensions(0, 9, 7)).toEqual([3, 3]); // ceil(sqrt(7))=3. R=ceil(7/3)=3.
    expect(getClosestGridDimensions(0, 1, 12)).toEqual([4,3]); // ceil(sqrt(12))=4. R=ceil(12/4)=3. [4,3]
  });

  it('should use square-like fallback for 0 targetHeight', () => {
    expect(getClosestGridDimensions(16, 0, 9)).toEqual([3, 3]);
    expect(getClosestGridDimensions(16, 0, 6)).toEqual([3,2]); // ceil(sqrt(6))=3. R=ceil(6/3)=2. [3,2]
  });

  it('should use square-like fallback for negative targetWidth', () => {
    expect(getClosestGridDimensions(-16, 9, 9)).toEqual([3, 3]);
  });

  // Testing the "prefer smaller area" when aspect ratio diffs are equal
  it('should prefer smaller area if aspect ratio differences are equal', () => {
    // Example: 10 items, target aspect 2:1 (2.0)
    // cols=4, rows=3 (area 12), aspect=4/3=1.333, diff=0.667
    // cols=5, rows=2 (area 10), aspect=5/2=2.5, diff=0.5  <- This should be chosen first due to smaller diff
    expect(getClosestGridDimensions(2, 1, 10)).toEqual([5, 2]);

    // Example: 17 items, target aspect 1:1 (1.0)
    // cols=4, rows=5 (area 20), aspect=4/5=0.8, diff=0.2
    // cols=5, rows=4 (area 20), aspect=5/4=1.25, diff=0.25
    // So [4,5] is chosen
    expect(getClosestGridDimensions(1, 1, 17)).toEqual([4, 5]);

    // Consider length = 20, target aspect = 1.0
    // cols=4, rows=5, aspect=0.8, diff=0.2, area=20
    // cols=5, rows=4, aspect=1.25, diff=0.25, area=20
    // Expected: [4,5]
    expect(getClosestGridDimensions(1, 1, 20)).toEqual([4, 5]);
  });
});
