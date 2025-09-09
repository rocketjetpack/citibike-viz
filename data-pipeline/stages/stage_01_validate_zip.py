#!/usr/bin/env python3

# This stage does the following:
# Validate that the set of ZIP files to be processed contains the expected CSV files without
#   any extra data such as extreneous files or directories.
#
# Later states of this pipeline are somewhat naive and will fail if there are invalid CSV files
#   or temporary files, hidden files, or OS-generated metadata files.

import sys
import logging
from pathlib import Path
import zipfile
import re

if __name__ == "__main__":
  print("Do not run this stage interactively.")
  sys.exit(1)

def find_zip_files(input_dir):
  print(f"Looking for ZIP file at {input_dir}")
  for zip_file in list(input_dir.glob("*.zip")):
    if validate_zip(input_dir, zip_file) == False:
      return False
  return True

def validate_zip(input_dir, zip_name):
  csv_pattern = re.compile(r"^\d{6}-citibike-tripdata_\d+\.csv$")
  print(f"Validating ZIP file {input_dir}/{zip_name}...")
  zip_path = input_dir / zip_name
  try:
    with zipfile.ZipFile(zip_path, 'r') as zf:
      invalid_files = [f for f in zf.namelist() if not csv_pattern.match(f)]
      if invalid_files:
        print(f"Warning: {input_dir}/{zip_name} contains invalid contents:")
        print("\n".join(f"  - {f}" for f in invalid_files))
  except zipfile.BadZipFile:
    print(f"Error: {zip_name} is not a valid ZIP file.")
  except Exception as e:
    print(f"Error: Unspecified error {e}")

def run(input_dir, work_dir, output_dir):
  return find_zip_files(input_dir)