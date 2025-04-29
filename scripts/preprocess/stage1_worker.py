import os
import csv
import zipfile
from datetime import datetime
import multiprocessing

# Define the allowed columns
ALLOWED_COLUMNS = [
    "ride_id", "rideable_type", "started_at", "ended_at",
    "start_station_name", "start_station_id", "end_station_name", "end_station_id",
    "start_lat", "start_lng", "end_lat", "end_lng", "member_casual"
]

def load_station_ids(path):
    """Load a list of valid station IDs from the given CSV file."""
    station_ids = set()
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            station_ids.add(row['station_id'])
    return station_ids

def get_month_from_datetime(date_str):
    """Convert datetime string into YYYY-MM format."""
    for fmt in ('%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S.%f'):
        try:
            return datetime.strptime(date_str, fmt).strftime('%Y-%m')
        except ValueError:
            continue
    return None

def write_row_to_file(station_id, month, trip_type, fieldnames, row, output_base_dir):
    """Write the row to the corresponding CSV file."""
    # Filter the row to keep only the allowed columns
    row = {key: value for key, value in row.items() if key in ALLOWED_COLUMNS}
    
    # Check for exactly 13 columns in the row after filtering
    if len(row) != len(ALLOWED_COLUMNS):
        print(f"Error: Row has {len(row)} columns, expected {len(ALLOWED_COLUMNS)} after filtering.")
        if len(row) == 14:
            print(f"Row with 14 columns: {row}")  # Print the row with 14 columns for debugging
        log_failed_file(row)
        raise ValueError(f"Row in {station_id} file does not have 13 valid columns after filtering!")

    folder = os.path.join(output_base_dir, station_id[:2], station_id)
    os.makedirs(folder, exist_ok=True)
    filename = f'{month}-{trip_type}.csv'
    path = os.path.join(folder, filename)

    # Check if the file exists, and write headers only if it's a new file
    file_exists = os.path.exists(path)
    with open(path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=ALLOWED_COLUMNS)
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)

def log_failed_file(row):
    """Logs the row from files with incorrect columns to a log file."""
    with open('failed-to-parse-from-stage1.txt', 'a') as log_file:
        log_file.write(f"Failed row: {row}\n")

def process_zip_batch(zip_file_list, station_list_path, output_base_dir):
    """Process a batch of ZIP files, partitioning the rides by station and date."""
    pid = multiprocessing.current_process().pid
    station_ids = load_station_ids(station_list_path)

    for zip_path in zip_file_list:
        print(f"[PID {pid}] Processing ZIP: {os.path.basename(zip_path)}")

        record_count = 0
        with zipfile.ZipFile(zip_path, 'r') as zf:
            for csv_filename in zf.namelist():
                if not csv_filename.endswith('.csv'):
                    continue
                with zf.open(csv_filename) as csvfile:
                    reader = csv.DictReader((line.decode('utf-8') for line in csvfile))
                    for row in reader:
                        # Skip rows with missing values or invalid format
                        if len(row) != len(reader.fieldnames):
                            print(f"⚠️ Invalid row in {csv_filename}: {row}")
                            continue

                        # Extract data
                        sid = row.get('start_station_id')
                        eid = row.get('end_station_id')
                        started_at = row.get('started_at')
                        month = get_month_from_datetime(started_at)

                        # Skip if month is invalid
                        if not month:
                            continue

                        # Only write rows where both station IDs are valid
                        if sid in station_ids and eid in station_ids:
                            write_row_to_file(sid, month, 'outbound', reader.fieldnames, row, output_base_dir)
                            write_row_to_file(eid, month, 'inbound', reader.fieldnames, row, output_base_dir)

                        # Print progress every 50,000 rows processed
                        if record_count % 50000 == 0:
                            print(f"[PID {pid}] Processed {record_count:,} rows from {os.path.basename(zip_path)}")

                        record_count += 1

        print(f"[PID {pid}] Finished {os.path.basename(zip_path)} - Total rows: {record_count:,}")
