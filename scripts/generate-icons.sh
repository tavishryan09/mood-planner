#!/bin/bash

# Script to generate all app icons from a source image
# Usage: ./scripts/generate-icons.sh <source-image-path>

SOURCE_IMAGE="$1"

if [ -z "$SOURCE_IMAGE" ]; then
    echo "Usage: $0 <source-image-path>"
    echo "Example: $0 ~/Downloads/logo.png"
    exit 1
fi

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: Source image not found: $SOURCE_IMAGE"
    exit 1
fi

echo "Generating icons from: $SOURCE_IMAGE"

# Create a temporary square version of the image (crop to center square)
TEMP_SQUARE="/tmp/icon-square.png"

# Get image dimensions
WIDTH=$(sips -g pixelWidth "$SOURCE_IMAGE" | tail -1 | awk '{print $2}')
HEIGHT=$(sips -g pixelHeight "$SOURCE_IMAGE" | tail -1 | awk '{print $2}')

echo "Source dimensions: ${WIDTH}x${HEIGHT}"

# Determine the smaller dimension for square crop
if [ $WIDTH -lt $HEIGHT ]; then
    SIZE=$WIDTH
else
    SIZE=$HEIGHT
fi

# Crop to center square
sips -z $SIZE $SIZE "$SOURCE_IMAGE" --out "$TEMP_SQUARE" > /dev/null 2>&1

echo "Created square crop: ${SIZE}x${SIZE}"

# Generate PWA icons in public directory
echo "Generating PWA icons..."
sips -z 144 144 "$TEMP_SQUARE" --out "public/icon-144.png" > /dev/null 2>&1
sips -z 180 180 "$TEMP_SQUARE" --out "public/icon-180.png" > /dev/null 2>&1
sips -z 192 192 "$TEMP_SQUARE" --out "public/icon-192.png" > /dev/null 2>&1
sips -z 512 512 "$TEMP_SQUARE" --out "public/icon-512.png" > /dev/null 2>&1

echo "✓ Generated public/icon-144.png"
echo "✓ Generated public/icon-180.png"
echo "✓ Generated public/icon-192.png"
echo "✓ Generated public/icon-512.png"

# Generate favicon (16x16 and 32x32 in one .ico file)
echo "Generating favicon..."
FAVICON_16="/tmp/favicon-16.png"
FAVICON_32="/tmp/favicon-32.png"

sips -z 16 16 "$TEMP_SQUARE" --out "$FAVICON_16" > /dev/null 2>&1
sips -z 32 32 "$TEMP_SQUARE" --out "$FAVICON_32" > /dev/null 2>&1

# Note: macOS sips cannot create .ico files directly
# We'll create a 32x32 PNG and rename it
sips -z 32 32 "$TEMP_SQUARE" --out "app/favicon.ico" > /dev/null 2>&1

echo "✓ Generated app/favicon.ico (32x32 PNG format)"
echo ""
echo "Note: For a true .ico file with multiple sizes, use online tools or ImageMagick:"
echo "  convert $FAVICON_16 $FAVICON_32 app/favicon.ico"
echo ""

# Clean up temp files
rm -f "$TEMP_SQUARE" "$FAVICON_16" "$FAVICON_32"

echo "✅ All icons generated successfully!"
echo ""
echo "Generated files:"
echo "  - public/icon-144.png (PWA)"
echo "  - public/icon-180.png (Apple Touch Icon)"
echo "  - public/icon-192.png (PWA)"
echo "  - public/icon-512.png (PWA)"
echo "  - app/favicon.ico (Browser)"
