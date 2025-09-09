import os
import json
from pathlib import Path
from collections import defaultdict, Counter
from multiprocessing import Pool, cpu_count
from tqdm import tqdm
from datetime import datetime
import shutil
import re

# Extract "YYYY-mm" from timestamp
def get_ym(timestamp):
    try:
        return datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S.%f").strftime("%Y-%m")
    except Exception:
        return None

# Process one file and return a dictionary: {month -> Counter of (start_id, end_id)}
def process_file(path):
    result = defaultdict(Counter)

    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for ride in data.get("rides", []):
        if ride.get("direction") != "0":
            continue

        start = ride.get("start_station_id")
        end = ride.get("end_station_id")
        month = get_ym(ride.get("started_at"))

        if start and end and month:
            result[month][(start, end)] += 1

    return result

# Merge all partial results
def merge_results(partial_results):
    final = defaultdict(Counter)
    for part in partial_results:
        for month, counter in part.items():
            final[month].update(counter)
    return final

# Save results to correct path format
def save_top_50(final_counts, output_dir):
    for month, counter in final_counts.items():
        top_50 = counter.most_common(50)
        formatted = [
            {
                "start_station_id": sid,
                "end_station_id": eid,
                "count": count
            }
            for (sid, eid), count in top_50
        ]
        out_path = output_dir / f"{month}-top-50.json"
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(formatted, f, indent=4)

# Main pipeline
def run(input_dir, work_dir, output_dir):
    json_files = list(output_dir.rglob("*/*/*.json"))

    with Pool(processes=2 * cpu_count()) as pool:
        results = list(tqdm(pool.imap(process_file, json_files), total=len(json_files), desc="Processing JSON files"))

    final_counts = merge_results(results)
    save_top_50(final_counts, output_dir)

    print(f"✅ Stage 5 complete: Top 50 outbound rides per month written to {output_dir}.")

if __name__ == "__main__":
    print("Do not run this script interactively.")
