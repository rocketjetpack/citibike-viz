#!/usr/bin/env python3

# This stage does the following:
# Remove all month level ridership CSVs from station directories in the output folder

import re
from pathlib import Path

def run(input_dir, work_dir, output_dir):
    """
    Remove all files in output_dir matching pattern YYYY-MM-ridedata.csv
    """
    pattern = re.compile(r"^\d{4}-\d{2}-ridedata\.csv$")

    deleted = 0
    for path in Path(output_dir).rglob("*.csv"):
        if pattern.match(path.name):
            path.unlink()
            deleted += 1

    print(f"[CLEANUP] Deleted {deleted} files from {output_dir}")