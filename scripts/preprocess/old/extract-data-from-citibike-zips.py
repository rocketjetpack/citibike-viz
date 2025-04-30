#!/usr/bin/env python3

import os
import zipfile
import pandas as pd
import math
from tqdm import tqdm

# Functions
def calculate_distance(lat_1, lng_1, lat_2, lng_2):
    """
    Calculate the great-circle distance between two sets of latitude/longitude points.
    Return distance in meters.
    """
    R = 6371.0  # Earth radius in km
    phi1 = math.radians(lat_1)
    phi2 = math.radians(lat_2)
    delta_phi = math.radians(lat_2 - lat_1)
    delta_lambda = math.radians(lng_1 - lng_2)

    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    distance = R * c * 1000  # Convert to meters
    return distance

def process_ride(row, stations):
    """
    Process a single ride row.
    
    Args:
        row: Pandas Series representing a ride
        stations: Global station lookup {station_id: {name, lat, lng}}
        
    Returns:
        Two ride entries:
          - One for start_station_id (outbound)
          - One for end_station_id (inbound)
    """
    try:
        # Extract basic fields
        start_station_id = str(row['start_station_id'])
        end_station_id = str(row['end_station_id'])
        start_time = pd.to_datetime(row['started_at'])
        end_time = pd.to_datetime(row['ended_at'])
        bike_type = row['rideable_type']

        # Lookup lat/lng for distance calculation
        start_lat = stations.get(start_station_id, {}).get('lat')
        start_lng = stations.get(start_station_id, {}).get('lng')
        end_lat = stations.get(end_station_id, {}).get('lat')
        end_lng = stations.get(end_station_id, {}).get('lng')

        # Sanity check if station coordinates are missing
        if None in [start_lat, start_lng, end_lat, end_lng]:
            raise ValueError(f"Missing coordinates for start station {start_station_id} or end station {end_station_id}")

        # Calculate distance (meters) and elapsed time (seconds)
        distance = calculate_distance(start_lat, start_lng, end_lat, end_lng)
        elapsed_time = (end_time - start_time).total_seconds()

        if elapsed_time <= 0:
            raise ValueError("Invalid ride duration (zero or negative time)")

        avg_speed_mps = distance / elapsed_time  # meters per second

        # Create outbound ride log (origin station)
        outbound = {
            'bike_type': bike_type,
            'start_time': start_time,
            'end_time': end_time,
            'elapsed_time_sec': elapsed_time,
            'distance_m': distance,
            'avg_speed_mps': avg_speed_mps,
            'direction': 'outbound'
        }

        # Create inbound ride log (destination station)
        inbound = {
            'bike_type': bike_type,
            'start_time': start_time,
            'end_time': end_time,
            'elapsed_time_sec': elapsed_time,
            'distance_m': distance,
            'avg_speed_mps': avg_speed_mps,
            'direction': 'inbound'
        }

        return (start_station_id, outbound), (end_station_id, inbound)

    except Exception as e:
        # Log error to a file for later review
        with open('error_log.txt', 'a') as log_file:
            log_file.write(f"Error processing ride (ID {row.get('ride_id', 'N/A')}): {str(e)}\n")
        return None, None

# location for all the citibike raw data zip files
zip_path = '../../private/raw_data/2024/'

# location to save the list of stations with lat/lng coordinates, station_name, and station_id
station_list_csv = '../../public/data/station_list.csv'

# location to save the individual station files with station_id, and inbound/outbound ride counts by month
station_data_path = '../../public/data/stations/'

# location to save individual ride data organized by station with inbound/outbound, bike type, start/end station, distance, time, and speed
ride_data_path = '../../public/data/rides/'

# Build a list of zip files to process
zip_file_list = [f for f in os.listdir(zip_path) if f.endswith('.zip')]
# Limit testing to a single zip file
zip_file_list = [zip_file_list[0]]
print(f"Identified {len(zip_file_list)} input ZIP files to process.")



# Setup output directories
os.makedirs(station_data_path, exist_ok=True)
os.makedirs(ride_data_path, exist_ok=True)

# Initialize storage structures
stations = {}
station_monthly_counts = {}
station_ride_logs = {}

# Process each zip file
for zip_file in zip_file_list:
    print(f"Processing {zip_file}...")
    with zipfile.ZipFile(os.path.join(zip_path, zip_file), 'r') as archive:
        csv_files = [name for name in archive.namelist() if name.endswith('.csv')]

        # Process each CSV file with a progress bar
        for csv_file in csv_files:
            print(f"  Reading {csv_file}...")
            with archive.open(csv_file) as file:
                df = pd.read_csv(file)

                # Use tqdm to add a progress bar while processing rows
                for idx, row in tqdm(df.iterrows(), total=df.shape[0], desc=f"Processing {csv_file}"):
                    # Update station info (if not already in the station list)
                    start_station_id = str(row['start_station_id'])
                    if start_station_id not in stations:
                        stations[start_station_id] = {
                            'station_name': row['start_station_name'],
                            'lat': row['start_lat'],
                            'lng': row['start_lng']
                        }

                    end_station_id = str(row['end_station_id'])
                    if end_station_id not in stations:
                        stations[end_station_id] = {
                            'station_name': row['end_station_name'],
                            'lat': row['end_lat'],
                            'lng': row['end_lng']
                        }

                    # Process ride entries and handle errors
                    ride_outbound, ride_inbound = process_ride(row, stations)

                    if ride_outbound is None and ride_inbound is None:
                        continue  # Skip this row if both rides failed

                    # Parse ride month from start_time
                    try:
                        month_str = pd.to_datetime(row['started_at']).strftime('%Y-%m')  # e.g., '2024-04'
                    except Exception as e:
                        with open('error_log.txt', 'a') as log_file:
                            log_file.write(f"Error parsing date for ride (ID {row.get('ride_id', 'N/A')}): {str(e)}\n")
                        continue  # Skip bad row

                    # Update outbound station logs
                    if ride_outbound:
                        sid, ride_data = ride_outbound
                        # Update monthly counts
                        station_monthly_counts.setdefault(sid, {})
                        station_monthly_counts[sid].setdefault(month_str, {'rides_as_origin': 0, 'rides_as_dest': 0})
                        station_monthly_counts[sid][month_str]['rides_as_origin'] += 1

                        # Append ride log
                        station_ride_logs.setdefault(sid, {})
                        station_ride_logs[sid].setdefault(month_str, [])
                        station_ride_logs[sid][month_str].append(ride_data)

                    # Update inbound station logs
                    if ride_inbound:
                        sid, ride_data = ride_inbound
                        # Update monthly counts
                        station_monthly_counts.setdefault(sid, {})
                        station_monthly_counts[sid].setdefault(month_str, {'rides_as_origin': 0, 'rides_as_dest': 0})
                        station_monthly_counts[sid][month_str]['rides_as_dest'] += 1

                        # Append ride log
                        station_ride_logs.setdefault(sid, {})
                        station_ride_logs[sid].setdefault(month_str, [])
                        station_ride_logs[sid][month_str].append(ride_data)

# Save the station list
station_list_df = pd.DataFrame.from_dict(stations, orient='index')
station_list_df.index.name = 'station_id'
station_list_df.reset_index(inplace=True)
station_list_df.to_csv(station_list_csv, index=False)
print(f"Saved station list with {len(station_list_df)} stations.")

# Save station monthly counts
for station_id, months in station_monthly_counts.items():
    first_two = station_id[:2]
    station_folder = os.path.join(station_data_path, first_two)
    os.makedirs(station_folder, exist_ok=True)

    output_file = os.path.join(station_folder, f"{station_id}.csv")

    # Build a dataframe for this station
    rows = []
    for month, counts in months.items():
        row = {
            'station_id': station_id,
            'month_number': month,
            'rides_as_origin': counts['rides_as_origin'],
            'rides_as_dest': counts['rides_as_dest']
        }
        rows.append(row)

    df_station_months = pd.DataFrame(rows)
    df_station_months.to_csv(output_file, index=False)

print("Saved monthly ride count files for all stations.")

# Save station ride logs
for station_id, months in station_ride_logs.items():
    first_two = station_id[:2]
    station_folder = os.path.join(ride_data_path, first_two, station_id)
    os.makedirs(station_folder, exist_ok=True)

    for month, rides in months.items():
        output_file = os.path.join(station_folder, f"{month}.csv")
        df_rides = pd.DataFrame(rides)
        df_rides.to_csv(output_file, index=False)

print("Saved detailed ride logs for all stations.")
