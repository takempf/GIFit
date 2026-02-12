"""
Generate simple demo MP4 videos using raw frame data and Pillow.
Creates small animated videos suitable for the GIFit demo.
"""
import struct
import os
import io

try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

def create_frames(width, height, num_frames, variant):
    """Generate animation frames as raw RGB bytes."""
    frames = []
    for i in range(num_frames):
        t = i / num_frames
        img = Image.new('RGB', (width, height))
        draw = ImageDraw.Draw(img)

        if variant == 'gradient':
            # Animated gradient - shifting warm colors
            for y in range(height):
                r = int(200 + 55 * ((y / height + t) % 1.0))
                g = int(60 + 80 * ((y / height + t * 0.7) % 1.0))
                b = int(30 + 40 * ((y / height + t * 0.3) % 1.0))
                draw.line([(0, y), (width, y)], fill=(r, g, b))
            # Draw moving circle
            cx = int(width * (0.2 + 0.6 * t))
            cy = height // 2
            r = 30
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(255, 255, 255))

        elif variant == 'waves':
            # Ocean-like blue waves
            import math
            for y in range(height):
                for x in range(0, width, 2):
                    wave = math.sin(x * 0.02 + t * math.pi * 2 + y * 0.01)
                    r = int(20 + 30 * (wave + 1) / 2)
                    g = int(80 + 60 * (wave + 1) / 2)
                    b = int(160 + 90 * (wave + 1) / 2)
                    draw.point((x, y), fill=(r, g, b))
                    if x + 1 < width:
                        draw.point((x + 1, y), fill=(r, g, b))

        elif variant == 'bounce':
            # Bouncing colored shapes on dark background
            import math
            draw.rectangle([0, 0, width, height], fill=(20, 20, 30))
            for s in range(5):
                phase = s * 0.4
                x = int(width * (0.5 + 0.35 * math.sin(t * math.pi * 2 + phase)))
                y = int(height * (0.5 + 0.35 * math.cos(t * math.pi * 2 * 0.7 + phase)))
                colors = [(235, 10, 30), (30, 180, 230), (255, 200, 40), (50, 220, 100), (200, 100, 255)]
                color = colors[s % len(colors)]
                sz = 15 + s * 3
                draw.ellipse([x-sz, y-sz, x+sz, y+sz], fill=color)

        frames.append(img)
    return frames


def create_mjpeg_avi(frames, fps, output_path):
    """Create a simple MJPEG AVI file from PIL Image frames."""
    # Encode frames as JPEG
    jpeg_frames = []
    for frame in frames:
        buf = io.BytesIO()
        frame.save(buf, format='JPEG', quality=80)
        jpeg_frames.append(buf.getvalue())

    width, height = frames[0].size
    num_frames = len(jpeg_frames)

    # Build AVI file structure
    # RIFF header, AVI header, stream header, then MJPEG frames

    def fourcc(s):
        return s.encode('ascii')

    # Build movi chunk with frames
    movi_data = b''
    frame_offsets = []
    for jdata in jpeg_frames:
        # Pad to even size
        padded = jdata
        if len(padded) % 2 != 0:
            padded += b'\x00'
        frame_offsets.append(len(movi_data))
        chunk = fourcc('00dc') + struct.pack('<I', len(jdata)) + padded
        movi_data += chunk

    movi_chunk = fourcc('LIST') + struct.pack('<I', len(movi_data) + 4) + fourcc('movi') + movi_data

    # Build idx1 index
    idx1_data = b''
    for i, jdata in enumerate(jpeg_frames):
        idx1_data += fourcc('00dc')
        idx1_data += struct.pack('<I', 0x10)  # AVIIF_KEYFRAME
        idx1_data += struct.pack('<I', frame_offsets[i] + 4)  # offset from movi
        idx1_data += struct.pack('<I', len(jdata))
    idx1_chunk = fourcc('idx1') + struct.pack('<I', len(idx1_data)) + idx1_data

    # AVI Main Header (avih)
    us_per_frame = int(1000000 / fps)
    max_frame_size = max(len(j) for j in jpeg_frames)
    avih = struct.pack('<IIIIIIIIIIIIII',
        us_per_frame,       # dwMicroSecPerFrame
        max_frame_size * fps,  # dwMaxBytesPerSec
        0,                  # dwPaddingGranularity
        0x10,               # dwFlags (AVIF_HASINDEX)
        num_frames,         # dwTotalFrames
        0,                  # dwInitialFrames
        1,                  # dwStreams
        max_frame_size,     # dwSuggestedBufferSize
        width,              # dwWidth
        height,             # dwHeight
        0, 0, 0, 0         # dwReserved
    )
    avih_chunk = fourcc('avih') + struct.pack('<I', len(avih)) + avih

    # Stream Header (strh) for video
    strh = struct.pack('<4s4sIHHIIIIIIHHHH',
        fourcc('vids'),     # fccType
        fourcc('MJPG'),     # fccHandler
        0,                  # dwFlags
        0,                  # wPriority
        0,                  # wLanguage
        0,                  # dwInitialFrames
        1,                  # dwScale
        fps,                # dwRate
        0,                  # dwStart
        num_frames,         # dwLength
        max_frame_size,     # dwSuggestedBufferSize
        0xFFFFFFFF,         # dwQuality
        0,                  # dwSampleSize
        0, 0,               # rcFrame left, top
        width, height       # rcFrame right, bottom
    )
    strh_chunk = fourcc('strh') + struct.pack('<I', len(strh)) + strh

    # Stream Format (strf) for MJPEG - BITMAPINFOHEADER
    strf = struct.pack('<IiiHHIIiiII',
        40,                 # biSize
        width,              # biWidth
        height,             # biHeight (positive = bottom-up, but MJPG handles it)
        1,                  # biPlanes
        24,                 # biBitCount
        struct.unpack('<I', fourcc('MJPG'))[0],  # biCompression
        width * height * 3, # biSizeImage
        0, 0,               # biX/YPelsPerMeter
        0, 0                # biClrUsed, biClrImportant
    )
    strf_chunk = fourcc('strf') + struct.pack('<I', len(strf)) + strf

    # Stream list
    strl_data = strh_chunk + strf_chunk
    strl_chunk = fourcc('LIST') + struct.pack('<I', len(strl_data) + 4) + fourcc('strl') + strl_data

    # Header list
    hdrl_data = avih_chunk + strl_chunk
    hdrl_chunk = fourcc('LIST') + struct.pack('<I', len(hdrl_data) + 4) + fourcc('hdrl') + hdrl_data

    # Full RIFF AVI
    avi_data = hdrl_chunk + movi_chunk + idx1_chunk
    riff = fourcc('RIFF') + struct.pack('<I', len(avi_data) + 4) + fourcc('AVI ') + avi_data

    with open(output_path, 'wb') as f:
        f.write(riff)


def create_mp4_from_frames(frames, fps, output_path):
    """
    Create a simple MP4/H.264 file. Since we can't encode H.264 without ffmpeg,
    we'll create an MJPEG AVI which browsers can typically play, 
    then rename considerations... Actually let's just save as AVI with .avi extension
    and reference them as such.
    
    Better approach: save individual frames as a filmstrip image, and use
    canvas-based playback in the demo. But that's too complex.
    
    Simplest: Save as WebM with VP8. But we need codec support.
    
    Most practical: Save as MJPEG AVI - most browsers support this.
    """
    create_mjpeg_avi(frames, fps, output_path)


if __name__ == '__main__':
    if not HAS_PIL:
        print("ERROR: Pillow not available")
        exit(1)

    out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'landing', 'public', 'videos')
    os.makedirs(out_dir, exist_ok=True)

    videos = [
        {'name': 'gradient', 'variant': 'gradient', 'w': 320, 'h': 240, 'frames': 60, 'fps': 15},
        {'name': 'waves', 'variant': 'waves', 'w': 320, 'h': 240, 'frames': 45, 'fps': 15},
        {'name': 'bounce', 'variant': 'bounce', 'w': 320, 'h': 240, 'frames': 60, 'fps': 15},
    ]

    for v in videos:
        print(f"Generating {v['name']}...")
        frames = create_frames(v['w'], v['h'], v['frames'], v['variant'])
        out_path = os.path.join(out_dir, f"{v['name']}.avi")
        create_mjpeg_avi(frames, v['fps'], out_path)
        size = os.path.getsize(out_path)
        print(f"  -> {out_path} ({size / 1024:.1f} KB, {v['frames']} frames)")

    print("\nDone! Generated 3 demo videos.")
