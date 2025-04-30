#!/usr/bin/env python3

import os
import zipfile
import pandas as pd
import math
from tqdm import tqdm

# Functions
def calculate_distance(lat1, lng1, lat2, lng2):
    """
    Calculate the great-circle distance between two points
    on the earth using the haversine formula.
    Return distance in meters.
    """
    R = 6371.0  # Earth radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c * 1000  # Convert km to meters
    return distance

# Paths
zip_path = '../../private/raw_data/2024/'
station_list_csv = '../../public/data/station_list.csv'
station_data_path = '../../public/data/stations/'
ride_data_path = '../../public/data/rides/'

# Setup output directories
os.makedirs(station_data_path, exist_ok=True)
os.makedirs(ride_data_path, exist_ok=True)

# Build list of ZIP files
zip_file_list = [f for f in os.listdir(zip_path) if f.endswith('.zip')]
print(f"Identified {len(zip_file_list)} input ZIP files to process.")

# Initialize storage
stations = {}
station_monthly_counts = {}
station_ride_logs = {}

# Process each ZIP file
for zip_file in zip_file_list:
    zip_full_path = os.path.join(zip_path, zip_file)
    print(f"Processing {zip_file}...")

    with zipfile.ZipFile(zip_full_path, 'r') as archive:
        csv_files = [name for name in archive.namelist() if name.endswith('.csv')]

        for csv_file in csv_files:
            print(f"  Reading {csv_file}...")
            with archive.open(csv_file) as file:
                # Read CSV with only needed columns
                df = pd.read_csv(
                    file,
                    usecols=[
                        'ride_id', 'rideable_type', 'started_at', 'ended_at',
                        'start_station_id', 'start_station_name', 'start_lat', 'start_lng',
                        'end_station_id', 'end_station_name', 'end_lat', 'end_lng'
                    ],
                    parse_dates=['started_at', 'ended_at'],
                    low_memory=False
                )

                # Progress bar setup
                progress_bar = tqdm(total=len(df), desc=csv_file, ncols=100, unit=" rides")
                update_freq = 100000  # Update progress bar every 100,000 rows
                for idx, row in df.iterrows():
                    # Update progress bar every 100,000 rows
                    if idx % update_freq == 0:
                        progress_bar.update(update_freq)
                    
                    try:
                        # Collect station info
                        if pd.notnull(row['start_station_id']) and pd.notnull(row['start_lat']) and pd.notnull(row['start_lng']):
                            sid = str(row['start_station_id'])
                            if sid not in stations:
                                stations[sid] = {
                                    'station_id': sid,
                                    'station_name': row['start_station_name'],
                                    'lat': row['start_lat'],
                                    'lng': row['start_lng']
                                }

                        if pd.notnull(row['end_station_id']) and pd.notnull(row['end_lat']) and pd.notnull(row['end_lng']):
                            eid = str(row['end_station_id'])
                            if eid not in stations:
                                stations[eid] = {
                                    'station_id': eid,
                                    'station_name': row['end_station_name'],
                                    'lat': row['end_lat'],
                                    'lng': row['end_lng']
                                }

                        # Skip if any IDs missing
                        if pd.isnull(row['start_station_id']) or pd.isnull(row['end_station_id']):
                            continue

                        start_id = str(row['start_station_id'])
                        end_id = str(row['end_station_id'])

                        # Calculate month
                        month = row['started_at'].strftime('%Y-%m')

                        # Initialize structures
                        for station_id in [start_id, end_id]:
                            if station_id not in station_monthly_counts:
                                station_monthly_counts[station_id] = {}
                            if month not in station_monthly_counts[station_id]:
                                station_monthly_counts[station_id][month] = {'rides_as_origin': 0, 'rides_as_dest': 0}

                            if station_id not in station_ride_logs:
                                station_ride_logs[station_id] = {}
                            if month not in station_ride_logs[station_id]:
                                station_ride_logs[station_id][month] = []

                        # Update counts
                        station_monthly_counts[start_id][month]['rides_as_origin'] += 1
                        station_monthly_counts[end_id][month]['rides_as_dest'] += 1

                        # Calculate ride info
                        elapsed_time = (row['ended_at'] - row['started_at']).total_seconds()
                        if elapsed_time <= 0:
                            continue  # Skip bad rides

                        distance = calculate_distance(
                            row['start_lat'], row['start_lng'],
                            row['end_lat'], row['end_lng']
                        )
                        avg_speed = distance / elapsed_time if elapsed_time > 0 else 0

                        if row['rideable_type'] == 'classic_bike':
                            rideable_type = 0
                        elif row['rideable_type'] == 'electric_bike':
                            rideable_type = 1
                        else:
                            print(f"Unreconized rideable_type of {row['rideable_type']}")
                            continue
                            

                        # Save ride entries
                        for station_id, inbound_or_outbound in [(start_id, 1), (end_id, 0)]:
                            station_ride_logs[station_id][month].append({
                                'rideable_type': rideable_type,
                                'start_hour': row['started_at'].hour,
                                'elapsed_time': int(round(elapsed_time)),
                                'distance': int(round(distance)),
                                'avg_speed': round(avg_speed, 2),
                                'inbound_or_outbound': inbound_or_outbound
                            })

                    except Exception as e:
                        print(f"Warning: Skipping bad row due to {e}")
                
                # Update progress bar to 100% after processing
                progress_bar.update(len(df) % update_freq)
                progress_bar.close()

# Save station list
print("Saving station list...")
station_df = pd.DataFrame(stations.values())
station_df.to_csv(station_list_csv, index=False)

# Save monthly station counts
print("Saving monthly station data...")
for station_id, months in station_monthly_counts.items():
    folder = os.path.join(station_data_path, station_id[:2])
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f"{station_id}.csv")
    rows = []
    for month, counts in months.items():
        rows.append({
            'station_id': station_id,
            'month_number': month,
            'rides_as_origin': counts['rides_as_origin'],
            'rides_as_dest': counts['rides_as_dest']
        })
    df = pd.DataFrame(rows)
    df.to_csv(path, index=False)

# Save rides
print("Saving ride data...")
for station_id, months in station_ride_logs.items():
    folder = os.path.join(ride_data_path, station_id[:2], station_id)
    os.makedirs(folder, exist_ok=True)
    for month, rides in months.items():
        path = os.path.join(folder, f"{month}.csv")
        df = pd.DataFrame(rides)
        df.to_csv(path, index=False)

# Complete
print("Pre-processing completed.")
