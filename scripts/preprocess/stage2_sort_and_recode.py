import csv
import os
from pathlib import Path
from datetime import datetime
from zipfile import ZipFile
from multiprocessing import Pool, cpu_count
from tqdm import tqdm
from math import radians, sin, cos, sqrt, atan2

INPUT_DIR = Path('../../private/raw_data/2024')
OUTPUT_BASE = Path('../../private/stage2')
STATION_LIST_CSV = Path('../../private/stage1/station_list.csv')

# Load list of known station IDs
def load_station_ids(station_list_path):
    station_ids = set()
    with open(station_list_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            station_id = row.get('station_id')
            if station_id:
                station_ids.add(station_id)
    return station_ids

# Define output path per station/month
def get_output_path(station_id, year, month):
    prefix = station_id[:2] if len(station_id) >= 2 else '00'
    return OUTPUT_BASE / prefix / station_id / f"{year}-{month:02d}-ridedata.csv"

# Haversine formula to calculate the great circle distance
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    phi1 = radians(lat1)
    phi2 = radians(lat2)
    delta_phi = radians(lat2 - lat1)
    delta_lambda = radians(lon2 - lon1)

    a = sin(delta_phi / 2)**2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return round(R * c  * 1000.0) # Distance in meters

# Transform row according to the specified logic
def transform_row(row, current_station_id):
    fields_to_keep = [
        'rideable_type', 'started_at', 'ended_at',
        'start_station_id', 'end_station_id',
        'member_casual', 'start_lat', 'start_lng', 'end_lat', 'end_lng'
    ]
    try:
        row = {k: row[k] for k in fields_to_keep}
    except KeyError:
        return None

    row['rideable_type'] = '1' if row['rideable_type'] == 'electric_bike' else '0'
    row['member_casual'] = '1' if row['member_casual'] == 'member' else '0'

    is_start = row['start_station_id'] == current_station_id
    is_end = row['end_station_id'] == current_station_id
    if is_start and is_end:
        row['direction'] = '2'
    elif is_start:
        row['direction'] = '0'
    elif is_end:
        row['direction'] = '1'
    else:
        return None

    # Calculate ride time in seconds
    try:
        started_at = datetime.strptime(row['started_at'], '%Y-%m-%d %H:%M:%S.%f')
        ended_at = datetime.strptime(row['ended_at'], '%Y-%m-%d %H:%M:%S.%f')
    except ValueError:
        try:
            started_at = datetime.strptime(row['started_at'], '%Y-%m-%d %H:%M:%S')
            ended_at = datetime.strptime(row['ended_at'], '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return None
    ride_time = round((ended_at - started_at).total_seconds())
    row['ride_time'] = ride_time

    # Calculate ride distance (Haversine)
    try:
        start_lat = float(row['start_lat'])
        start_lng = float(row['start_lng'])
        end_lat = float(row['end_lat'])
        end_lng = float(row['end_lng'])
    except (ValueError, TypeError):
        return None
    
    ride_distance = haversine(start_lat, start_lng, end_lat, end_lng)
    row['ride_distance'] = round(ride_distance, 2)  # Distance in kilometers, rounded to 2 decimals

    return row

# Process a single zip file
def process_zip(args):
    zip_path, valid_stations = args
    output_buffers = {}  # {(station_id, year, month): [rows]}
    total_rows = 0
    bad_rows = 0
    skipped_station_rows = 0

    with ZipFile(zip_path, 'r') as z:
        for filename in z.namelist():
            if not filename.endswith('.csv'):
                continue

            with z.open(filename) as f:
                decoded_lines = (line.decode('utf-8') for line in f)
                reader = csv.DictReader(decoded_lines)

                for row in reader:
                    total_rows += 1
                    started_at = row.get('started_at')
                    start_id = row.get('start_station_id')
                    end_id = row.get('end_station_id')

                    if not start_id or not end_id or not started_at:
                        bad_rows += 1
                        continue

                    if start_id not in valid_stations or end_id not in valid_stations:
                        skipped_station_rows += 1
                        continue

                    # Try parsing timestamp with and without milliseconds
                    try:
                        dt = datetime.strptime(started_at, '%Y-%m-%d %H:%M:%S.%f')
                    except ValueError:
                        try:
                            dt = datetime.strptime(started_at, '%Y-%m-%d %H:%M:%S')
                        except ValueError:
                            bad_rows += 1
                            continue

                    for station_id in {start_id, end_id}:
                        transformed = transform_row(row, station_id)
                        if not transformed:
                            continue
                        key = (station_id, dt.year, dt.month)
                        output_buffers.setdefault(key, []).append(transformed)

    for (station_id, year, month), rows in output_buffers.items():
        output_path = get_output_path(station_id, year, month)
        os.makedirs(output_path.parent, exist_ok=True)
        write_header = not output_path.exists()
        with open(output_path, 'a', newline='', encoding='utf-8') as f_out:
            writer = csv.DictWriter(f_out, fieldnames=rows[0].keys())
            if write_header:
                writer.writeheader()
            writer.writerows(rows)

    print(f"[{zip_path.name}] Processed {total_rows} rows, {bad_rows} bad format, {skipped_station_rows} with unknown stations.")

# Main multiprocessing logic with progress bar
def main():
    valid_stations = load_station_ids(STATION_LIST_CSV)
    zip_files = sorted(INPUT_DIR.glob('*.zip'))
    print(f"Found {len(zip_files)} zip files. Loaded {len(valid_stations)} known station IDs.")

    args = [(zip_path, valid_stations) for zip_path in zip_files]

    with Pool(processes=cpu_count()) as pool:
        list(tqdm(pool.imap_unordered(process_zip, args),
                  total=len(zip_files), desc="Processing ZIPs"))

if __name__ == '__main__':
    main()
