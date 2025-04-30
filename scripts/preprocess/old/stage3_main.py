import os
import glob
import json
import multiprocessing as mp
import pandas as pd

INPUT_DIR = '../../private/stage2/stations/'
OUTPUT_JSON = '../../private/stage3/monthly_totals.json'
NUM_WORKERS = os.cpu_count() * 2

def extract_metadata(file_path):
    """Extracts station_id, year, month, and direction from path."""
    parts = file_path.split(os.sep)
    station_id = parts[-2]
    filename = os.path.basename(file_path)
    year, month, direction = filename.split('-')[0], filename.split('-')[1], filename.split('-')[2].split('.')[0]
    return station_id, year, month, direction

def process_file(file_path):
    """Processes a single CSV file and returns ride count info."""
    try:
        df = pd.read_csv(file_path)
        if df.empty:
            return None

        station_id, year, month, direction = extract_metadata(file_path)

        return {
            'station_id': station_id,
            'year': year,
            'month': month,
            'direction': direction,
            'count': len(df)
        }
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

def aggregate_results(results):
    """Combine all results into a single dictionary keyed by station_id."""
    aggregated = {}

    for result in results:
        if result is None:
            continue
        sid = result['station_id']
        year = result['year']
        month = result['month']
        direction = result['direction']
        count = result['count']

        if sid not in aggregated:
            aggregated[sid] = {}
        if year not in aggregated[sid]:
            aggregated[sid][year] = {}
        if month not in aggregated[sid][year]:
            aggregated[sid][year][month] = {'inbound': 0, 'outbound': 0}

        aggregated[sid][year][month][direction] = count

    return aggregated

def save_to_json(data, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

def main():
    csv_files = sorted(glob.glob(os.path.join(INPUT_DIR, '**', '*.csv'), recursive=True))
    print(f"Found {len(csv_files)} files to process.")

    with mp.Pool(processes=NUM_WORKERS) as pool:
        results = pool.map(process_file, csv_files)

    aggregated = aggregate_results(results)
    save_to_json(aggregated, OUTPUT_JSON)
    print(f"✅ Aggregation complete. Saved to {OUTPUT_JSON}")

if __name__ == '__main__':
    main()
