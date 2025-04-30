import os
import glob
import pandas as pd
import csv
import multiprocessing as mp
from datetime import datetime

INPUT_DIR = '../../private/stage1/stations/'
OUTPUT_DIR = '../../private/stage2/stations/'
FAILED_LOG = 'failed-to-parse-from-stage1.txt'

EXPECTED_COLUMNS = 13
NUM_WORKERS = os.cpu_count() * 2

def log_failed_file(file_path):
    with open(FAILED_LOG, 'a') as log_file:
        log_file.write(f"{file_path}\n")

def safe_read_csv(file_path):
    try:
        return pd.read_csv(file_path, error_bad_lines=False, warn_bad_lines=True)
    except Exception as e:
        print(f"\n❌ Failed to read CSV: {file_path}\n{e}")
        print("🔍 Scanning for malformed lines...")
        log_failed_file(file_path)

        valid_rows = []
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            for lineno, row in enumerate(reader, start=1):
                if len(row) != EXPECTED_COLUMNS:
                    print(f"⚠️ Malformed line {lineno} (found {len(row)} fields): {row}")
                    continue
                valid_rows.append(row)

        if valid_rows:
            return pd.DataFrame(valid_rows, columns=[
                'ride_id', 'start_station_id', 'start_station_name', 
                'start_lat', 'start_lng', 'end_station_id', 
                'end_station_name', 'end_lat', 'end_lng', 
                'rideable_type', 'member_casual', 'started_at', 'ended_at'
            ])
        else:
            print(f"❌ No valid rows found in {file_path}. Skipping...")
            return None

def process_file(file_path):
    df = safe_read_csv(file_path)
    if df is None or df.empty:
        print(f"🚫 Skipping {file_path} due to read error or empty content.")
        return

    try:
        drop_columns = [
            'ride_id', 'start_lat', 'start_lng',
            'end_lat', 'end_lng', 'start_station_name', 'end_station_name'
        ]
        df = df.drop(columns=[col for col in drop_columns if col in df.columns], errors='ignore')

        df['rideable_type'] = df['rideable_type'].map({'classic_bike': 0, 'electric_bike': 1})
        df['member_casual'] = df['member_casual'].map({'member': 0, 'casual': 1})

        start_times = pd.to_datetime(df['started_at'], errors='coerce')
        end_times = pd.to_datetime(df['ended_at'], errors='coerce')

        df['start_hour'] = start_times.dt.hour
        df['start_day'] = start_times.dt.day  # ← Day of the month
        df['ride_time'] = (end_times - start_times).dt.total_seconds().round().astype('Int64')

        df = df.drop(columns=['started_at', 'ended_at'])

        parts = file_path.split(os.sep)
        station_id = parts[-2]
        filename = os.path.basename(file_path)
        month_str = filename.split('-')[0]
        direction = 'inbound' if 'inbound' in filename else 'outbound'
        prefix = station_id[:2]

        out_dir = os.path.join(OUTPUT_DIR, prefix, station_id)
        os.makedirs(out_dir, exist_ok=True)

        out_file = os.path.join(out_dir, filename)
        df.to_csv(out_file, index=False)
        print(f"✅ Wrote {len(df)} rows → {out_file}")

    except Exception as e:
        print(f"🚨 Error processing {file_path}: {e}")

def process_files_in_parallel():
    csv_files = sorted(glob.glob(os.path.join(INPUT_DIR, '**', '*.csv'), recursive=True))
    print(f"📁 Found {len(csv_files)} input CSV files")

    with mp.Pool(processes=NUM_WORKERS) as pool:
        pool.map(process_file, csv_files)

def main():
    process_files_in_parallel()

if __name__ == '__main__':
    main()
