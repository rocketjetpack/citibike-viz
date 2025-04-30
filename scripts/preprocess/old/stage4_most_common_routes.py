import os
import glob
import json
import pandas as pd
from collections import Counter
from datetime import datetime
import multiprocessing as mp

INPUT_DIR = '../../private/stage2/stations/'
OUTPUT_PATH = '../../private/stage4/top_50_routes.json'
NUM_WORKERS = os.cpu_count() * 2  # You can adjust based on your system

def parse_filename(file_path):
    """Extract year-month and direction from the filename."""
    filename = os.path.basename(file_path)
    year_month = filename.split('-')[0]  # Extracts "YYYY-MM"
    direction = filename.split('-')[-1].replace('.csv', '')  # "inbound" or "outbound"
    return year_month, direction

def process_file(file_path):
    """Process a single file to determine most common start-end station pairs per month."""
    year_month, direction = parse_filename(file_path)
    print(f"📅 Processing file: {file_path} for {year_month} - {direction}")

    df = pd.read_csv(file_path)

    # Prepare to count pairs of (start_station_id, end_station_id)
    route_counter = Counter()

    for _, row in df.iterrows():
        start_station = row['start_station_id']
        end_station = row['end_station_id']
        route_counter[(start_station, end_station)] += 1

    # Create a list of the top 50 routes sorted by count
    top_50 = route_counter.most_common(50)

    # Convert to list of dictionaries with "start_station", "end_station", "count"
    top_50_routes = [{
        "start_station": start,
        "end_station": end,
        "count": count
    } for (start, end), count in top_50]

    return year_month, top_50_routes

def aggregate_top_routes():
    """Aggregate the top 50 most common routes for each month."""
    files = glob.glob(os.path.join(INPUT_DIR, '**', '*.csv'), recursive=True)
    print(f"📁 Found {len(files)} CSV files for processing...")

    # Use multiprocessing to process the files in parallel
    with mp.Pool(processes=NUM_WORKERS) as pool:
        results = pool.map(process_file, files)

    # Aggregate results into a dictionary
    monthly_top_routes = {}

    for year_month, top_50 in results:
        if year_month not in monthly_top_routes:
            monthly_top_routes[year_month] = []
        monthly_top_routes[year_month].extend(top_50)

    # Ensure top 50 routes per month are kept (in case more than 50 routes are found)
    for month in monthly_top_routes:
        # Sort by count in descending order and take only top 50
        monthly_top_routes[month] = sorted(monthly_top_routes[month], key=lambda x: x['count'], reverse=True)[:50]

    # Write the aggregated data to a JSON file
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(monthly_top_routes, f, indent=2)

    print(f"✅ Saved the top 50 routes to {OUTPUT_PATH}")

def main():
    """Main entry point for the aggregation."""
    aggregate_top_routes()

if __name__ == '__main__':
    main()
