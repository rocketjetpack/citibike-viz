#!/usr/bin/env python3

# Imports
import os
import zipfile
import pandas as pd
import csv
from pathlib import Path
from collections import defaultdict

# Paths
zip_path = '../../private/raw_data/2024/'
station_list_csv = '../../public/data/station_list.csv'
ride_output_dir = '../../public/data/stations/'

# Build list of ZIP files
zip_file_list = [f for f in os.listdir(zip_path) if f.endswith('.zip')]
# Uncomment below to process all ZIPs; currently processes only first for testing
zip_file_list = [zip_file_list[0]]

print(f"Identified {len(zip_file_list)} input ZIP files to process.")

# Initialize storage
stations = {}

def write_ride_row(station_id, year_month, row):
    top_dir = station_id[:2] if len(station_id) >= 2 else 'xx'
    out_dir = os.path.join(ride_output_dir, top_dir, station_id)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f'{year_month}-tripdata.csv')

    file_exists = os.path.exists(out_path)

    with open(out_path, 'a', newline='', encoding='utf-8') as file_handle:
        writer = csv.DictWriter(file_handle, fieldnames=[
            'rideable_type', 'started_at', 'ended_at',
            'start_station_id', 'end_station_id', 'member_casual'
        ])
        if not file_exists:
            writer.writeheader()
        writer.writerow({
            'rideable_type': row['rideable_type'],
            'started_at': row['started_at'],
            'ended_at': row['ended_at'],
            'start_station_id': row['start_station_id'],
            'end_station_id': row['end_station_id'],
            'member_casual': row['member_casual']
        })

# Process each ZIP file
for zip_file in zip_file_list:
    zip_full_path = os.path.join(zip_path, zip_file)
    print(f"Processing {zip_file}...")

    with zipfile.ZipFile(zip_full_path, 'r') as archive:
        csv_files = [name for name in archive.namelist() if name.endswith('.csv')]

        for csv_file in csv_files:
            print(f"  Reading {csv_file}...")
            with archive.open(csv_file) as file:
                df = pd.read_csv(file, parse_dates=['started_at', 'ended_at'], low_memory=False)

                # Drop rows with missing station info
                df.dropna(subset=['start_station_id', 'start_station_name'], inplace=True)

                # Extract year-month
                df['year_month'] = df['started_at'].dt.to_period('M').astype(str)

                row_count = 0
                for _, row in df.iterrows():
                    station_id = str(row['start_station_id']).strip()
                    station_name = str(row['start_station_name']).strip()
                    lat = row['start_lat']
                    lng = row['start_lng']
                    year_month = row['year_month']

                    # Store station metadata
                    if station_id not in stations:
                        stations[station_id] = {
                            'name': station_name,
                            'lat': lat,
                            'lng': lng
                        }

                    # Write ride row and close file
                    write_ride_row(station_id, year_month, row)

                    # Progress update
                    row_count += 1
                    if row_count % 100000 == 0:
                        print(f"    Processed {row_count} rows...")

# Write unique station list to CSV
station_df = pd.DataFrame([
    {'station_id': sid, 'station_name': info['name'], 'lat': info['lat'], 'lng': info['lng']}
    for sid, info in stations.items()
])
station_df.to_csv(station_list_csv, index=False)
print(f"Wrote station list to {station_list_csv}")
