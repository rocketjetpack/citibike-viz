#!/usr/bin/env python3

import json
import glob
import csv
from collections import Counter
from multiprocessing import Pool
from tqdm import tqdm
import matplotlib.pyplot as plt

# Directory pattern
data_dir_pattern = "../../public_html/data/stations/*/*/2024-*-ridedata.json"

MAX_RIDE_DURATION = 7200  # 2 hours in seconds

def process_single_file(filepath):
    local_counts = Counter()
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        for ride in data.get("rides", []):
            try:
                ride_time = int(ride.get("ride_time", 0))
                # Ignore negative ride times and rides longer than 2 hours
                if 0 <= ride_time <= MAX_RIDE_DURATION:
                    local_counts[ride_time] += 1
            except (ValueError, TypeError):
                continue
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    return local_counts

def main():
    filepaths = list(glob.glob(data_dir_pattern))
    total_files = len(filepaths)
    if total_files == 0:
        print("No JSON files found.")
        return

    total_counts = Counter()

    with Pool(processes=20) as pool:
        for result in tqdm(pool.imap_unordered(process_single_file, filepaths), total=total_files, desc="Processing files"):
            total_counts.update(result)

    # Write CSV
    output_csv = "ride_time_counts.csv"
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["ride_duration", "count"])
        for ride_time in sorted(total_counts):
            writer.writerow([ride_time, total_counts[ride_time]])

    print(f"Saved ride time counts to {output_csv}")

    # Group ride times into 5-minute buckets
    bucketed_counts = Counter()
    for ride_time, count in total_counts.items():
        if ride_time >= 0:
            # Group into 5-minute (300-second) intervals
            bucket = (ride_time // 300) * 300  # 300 seconds = 5 minutes
            bucketed_counts[bucket] += count

    # Prepare data for the histogram
    buckets = sorted(bucketed_counts)
    values = [bucketed_counts[b] for b in buckets]

    # Convert bucketed times from seconds to minutes
    bucket_labels = [b // 60 for b in buckets]  # Convert to minutes

    # Plotting the histogram
    plt.figure(figsize=(12, 6))
    plt.bar(bucket_labels, values, width=5, align='center', color='skyblue')
    plt.xlabel("Ride Duration (minutes, 5-minute intervals)")
    plt.ylabel("Number of Rides")
    plt.title("Histogram of Ride Durations (Grouped into 5-minute Buckets)")
    plt.xticks(bucket_labels)  # Show the minutes on the x-axis
    plt.tight_layout()
    plt.savefig("ride_duration_histogram_5min.png")
    print("Saved histogram to ride_duration_histogram_5min.png")

if __name__ == "__main__":
    main()

