#!/bin/bash

# Config
MINIO_ALIAS="myminio"
BUCKET_NAME="hrm"
INPUT_PATH="$1"    # example: path/to/input.docx
OUTPUT_PATH="$2"   # example: path/to/output.pdf

TEMP_DIR="/tmp/docflow_convert"
INPUT_FILE="$TEMP_DIR/input.docx"
OUTPUT_FILE="$TEMP_DIR/output.pdf"

# Prepare temp folder
mkdir -p "$TEMP_DIR"

# Download input file
mc alias set myminio http://192.168.82.98:9000 HRM2025!@#
mc cp "${MINIO_ALIAS}/${BUCKET_NAME}/${INPUT_PATH}" "$INPUT_FILE"

# Convert with LibreOffice
libreoffice --headless --convert-to pdf "$INPUT_FILE" --outdir "$TEMP_DIR"

# Upload output file back to MinIO
mc cp "$OUTPUT_FILE" "${MINIO_ALIAS}/${BUCKET_NAME}/${OUTPUT_PATH}"

# Clean up
rm -f "$INPUT_FILE"
rm -f "$OUTPUT_FILE"

exit 0
