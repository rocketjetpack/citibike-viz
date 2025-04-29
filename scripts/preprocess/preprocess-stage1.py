import os
import csv
import zipfile
import shutil
from datetime import datetime
import sys

def stage1_partition_rides_by_station():
    station_list_path = '../../private/stage0/station_list.csv'
    raw_data_dir = '../../private/raw_data/2024/'
    output_base_dir = '../../private/stage1/stations/'
    max_rows = 10000000000  # Limit for testing
    debug_limit = 10   # Show a few debug messages

    # Read station IDs
    station_ids = set()
    with open(station_list_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            station_ids.add(row['station_id'])

    print(f"Loaded {len(station_ids)} unique station IDs.")

    # Clear output directory
    if os.path.exists(output_base_dir):
        shutil.rmtree(output_base_dir)
    os.makedirs(output_base_dir, exist_ok=True)

    row_counter = 0
    written_counter = 0

    def print_progress(count):
        sys.stdout.write(f'\rProcessed rows: {count:,}')
        sys.stdout.flush()

    def get_month_from_datetime(date_str):
        for fmt in ('%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S.%f'):
            try:
                return datetime.strptime(date_str, fmt).strftime('%Y-%m')
            except ValueError:
                continue
        if debug_limit > 0:
            print(f"\n[DEBUG] Unrecognized datetime format: {date_str}")
        return None

    def write_row_to_file(station_id, month, trip_type, fieldnames, row):
        folder = os.path.join(output_base_dir, station_id[:2], station_id)
        os.makedirs(folder, exist_ok=True)
        filename = f'{month}-{trip_type}.csv'
        path = os.path.join(folder, filename)

        file_exists = os.path.exists(path)
        with open(path, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()
            writer.writerow(row)

    # Process each ZIP file
    for zip_filename in os.listdir(raw_data_dir):
        if not zip_filename.endswith('.zip'):
            continue

        with zipfile.ZipFile(os.path.join(raw_data_dir, zip_filename), 'r') as zf:
            for csv_filename in zf.namelist():
                if not csv_filename.endswith('.csv'):
                    continue

                with zf.open(csv_filename) as csvfile:
                    reader = csv.DictReader((line.decode('utf-8') for line in csvfile), delimiter=',')

                    for row in reader:
                        row_counter += 1
                        if row_counter % 50000 == 0:
                            print_progress(row_counter)
                        if row_counter > max_rows:
                            break

                        sid = row.get('start_station_id')
                        eid = row.get('end_station_id')
                        started_at = row.get('started_at')
                        month = get_month_from_datetime(started_at)
                        if not month:
                            continue

                        if sid in station_ids and eid in station_ids:
                            write_row_to_file(sid, month, 'outbound', reader.fieldnames, row)
                            write_row_to_file(eid, month, 'inbound', reader.fieldnames, row)
                            written_counter += 2
                            if debug_limit > 0:
                                print(f"\n[DEBUG] Wrote to {sid} (outbound) and {eid} (inbound)")
                                debug_limit -= 1
                        else:
                            if debug_limit > 0:
                                if sid not in station_ids:
                                    print(f"\n[DEBUG] Unknown start_station_id: {sid}")
                                if eid not in station_ids:
                                    print(f"\n[DEBUG] Unknown end_station_id: {eid}")
                                debug_limit -= 1

                if row_counter > max_rows:
                    break
        if row_counter > max_rows:
            break

    print_progress(row_counter)
    print(f'\nStage 1 complete: {written_counter} rows written to output.')

# Run it
if __name__ == '__main__':
    stage1_partition_rides_by_station()
