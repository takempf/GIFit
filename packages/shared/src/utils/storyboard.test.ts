import { parseStoryboardSpec, getStoryboardFrame } from './storyboard';
import { describe, it, expect } from 'vitest';

describe('storyboard utils', () => {
  // Increased count to 200 to allow testing second sheet
  const sampleSpec =
    'https://i.ytimg.com/sb/VIDEO_ID/storyboard3_L$L/$N.jpg|48#27#100#10#10#0#default#rs$AOn4CL|80#45#200#10#10#2000#M1#rs$AOn4CL';

  it('parses storyboard spec correctly', () => {
    const parsed = parseStoryboardSpec(sampleSpec);
    expect(parsed).not.toBeNull();
    expect(parsed?.baseUrl).toBe(
      'https://i.ytimg.com/sb/VIDEO_ID/storyboard3_L$L/$N.jpg'
    );
    expect(parsed?.levels).toHaveLength(2);
    expect(parsed?.levels[1]).toEqual({
      width: 80,
      height: 45,
      count: 200,
      cols: 10,
      rows: 10,
      interval: 2000,
      name: 'M1',
      signature: 'rs$AOn4CL'
    });
  });

  it('calculates frame correctly for first image', () => {
    const parsed = parseStoryboardSpec(sampleSpec);
    if (!parsed) throw new Error('Failed to parse');

    // Time 0 should be first frame
    const frame = getStoryboardFrame(parsed, 0);
    expect(frame).toEqual({
      url: 'https://i.ytimg.com/sb/VIDEO_ID/storyboard3_L1/M0.jpg?sigh=rs%24AOn4CL',
      x: 0,
      y: 0,
      width: 80,
      height: 45,
      sheetWidth: 800, // 80 * 10
      sheetHeight: 450,
      levelName: 'M1' // 45 * 10
    });
  });

  it('calculates frame correctly for second image', () => {
    const parsed = parseStoryboardSpec(sampleSpec);
    if (!parsed) throw new Error('Failed to parse');

    // Interval is 2000ms. 2500ms should be index 1 (second frame).
    const frame = getStoryboardFrame(parsed, 2500);

    // Index 1 is column 1, row 0 (since cols=10)
    expect(frame).toEqual({
      url: 'https://i.ytimg.com/sb/VIDEO_ID/storyboard3_L1/M0.jpg?sigh=rs%24AOn4CL',
      x: 80, // 1 * 80
      y: 0,
      width: 80,
      height: 45,
      sheetWidth: 800,
      sheetHeight: 450,
      levelName: 'M1'
    });
  });

  it('calculates frame correctly for image in second row', () => {
    const parsed = parseStoryboardSpec(sampleSpec);
    if (!parsed) throw new Error('Failed to parse');

    // Cols = 10. Index 11 should be row 1, col 1.
    // Interval 2000ms. Time = 11 * 2000 = 22000ms
    const frame = getStoryboardFrame(parsed, 22000);

    expect(frame).toEqual({
      url: 'https://i.ytimg.com/sb/VIDEO_ID/storyboard3_L1/M0.jpg?sigh=rs%24AOn4CL',
      x: 80, // col 1 * 80
      y: 45, // row 1 * 45
      width: 80,
      height: 45,
      sheetWidth: 800,
      sheetHeight: 450,
      levelName: 'M1'
    });
  });

  it('calculates frame correctly for image in second sheet', () => {
    const parsed = parseStoryboardSpec(sampleSpec);
    if (!parsed) throw new Error('Failed to parse');

    // Sheet size = 10 * 10 = 100 images.
    // We want index 105 (sheet 1, index 5).
    // Time = 105 * 2000 = 210000ms
    const frame = getStoryboardFrame(parsed, 210000);

    // Index 5 in sheet -> Row 0, Col 5
    expect(frame).toEqual({
      url: 'https://i.ytimg.com/sb/VIDEO_ID/storyboard3_L1/M1.jpg?sigh=rs%24AOn4CL',
      x: 400, // 5 * 80
      y: 0,
      width: 80,
      height: 45,
      sheetWidth: 800,
      sheetHeight: 450,
      levelName: 'M1'
    });
  });
});
