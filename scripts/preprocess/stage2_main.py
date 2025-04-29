import os
import glob
import pandas as pd
import csv
import multiprocessing as mp
from datetime import datetime

INPUT_DIR = '../../private/stage1/stations/'
OUTPUT_DIR = '../../private/stage2/stations/'
FAILED_LOG = 'failed-to-parse-from-stage1.txt'  # File to log problematic files

EXPECTED_COLUMNS = 13  # Adjust if your CSV format changes

# Define the number of parallel workers
NUM_WORKERS = os.cpu_count() * 2  # For example, twice the number of CPU cores

def log_failed_file(file_path):
    """Logs the name of files that failed to parse."""
    with open(FAILED_LOG, 'a') as log_file:
        log_file.write(f"{file_path}\n")

def safe_read_csv(file_path):
    """Reads CSV files while skipping malformed rows."""
    try:
        # Attempt to read the file normally
        return pd.read_csv(file_path, error_bad_lines=False, warn_bad_lines=True)
    except Exception as e:
        print(f"\n❌ Failed to read CSV: {file_path}\n{e}")
        print("🔍 Scanning for malformed lines...")

        # Log the failed file to a separate log file
        log_failed_file(file_path)

        valid_rows = []
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            for lineno, row in enumerate(reader, start=1):
                # Skip rows with incorrect number of columns
                if len(row) != EXPECTED_COLUMNS:
                    print(f"⚠️ Malformed line {lineno} (found {len(row)} fields): {row}")
                    continue  # Skip this row
                valid_rows.append(row)

        if valid_rows:
            return pd.DataFrame(valid_rows, columns=['ride_id', 'start_station_id', 'start_station_name', 
                                                      'start_lat', 'start_lng', 'end_station_id', 
                                                      'end_station_name', 'end_lat', 'end_lng', 
                                                      'rideable_type', 'member_casual', 'started_at', 'ended_at'])
        else:
            print(f"❌ No valid rows found in {file_path}. Skipping...")
            return None

def process_file(file_path):
    """Process each input file and output the cleaned data."""
    df = safe_read_csv(file_path)
    if df is None or df.empty:
        print(f"🚫 Skipping {file_path} due to read error or empty content.")
        return

    try:
        # Drop unused columns
        drop_columns = [
            'ride_id', 'start_lat', 'start_lng',
            'end_lat', 'end_lng', 'start_station_name', 'end_station_name'
        ]
        df = df.drop(columns=[col for col in drop_columns if col in df.columns], errors='ignore')

        # Map categorical columns
        df['rideable_type'] = df['rideable_type'].map({'classic_bike': 0, 'electric_bike': 1})
        df['member_casual'] = df['member_casual'].map({'member': 0, 'casual': 1})

        # Extract hour and ride time
        df['start_hour'] = pd.to_datetime(df['started_at'], errors='coerce').dt.hour
        df['ride_time'] = (
            pd.to_datetime(df['ended_at'], errors='coerce') -
            pd.to_datetime(df['started_at'], errors='coerce')
        ).dt.total_seconds()

        df = df.drop(columns=['started_at', 'ended_at'])

        # Get station info and construct output path
        parts = file_path.split(os.sep)
        station_id = parts[-2]
        filename = os.path.basename(file_path)
        month_str = filename.split('-')[0]  # e.g. '2024-03'
        direction = 'inbound' if 'inbound' in filename else 'outbound'
        prefix = station_id[:2]

        # Construct output directory path
        out_dir = os.path.join(OUTPUT_DIR, prefix, station_id)
        os.makedirs(out_dir, exist_ok=True)

        # Use the same filename as input for output
        out_file = os.path.join(out_dir, filename)

        df.to_csv(out_file, index=False)
        print(f"✅ Wrote {len(df)} rows → {out_file}")

    except Exception as e:
        print(f"🚨 Error processing {file_path}: {e}")

def process_files_in_parallel():
    """Process the files in parallel using multiprocessing."""
    # Get the list of input files
    csv_files = sorted(glob.glob(os.path.join(INPUT_DIR, '**', '*.csv'), recursive=True))
    print(f"📁 Found {len(csv_files)} input CSV files")

    # Use a Pool of workers to process the files in parallel
    with mp.Pool(processes=NUM_WORKERS) as pool:
        pool.map(process_file, csv_files)

def main():
    """Main entry point to execute the parallel file processing."""
    process_files_in_parallel()

if __name__ == '__main__':
    main()
