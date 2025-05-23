import os
import csv
import zipfile
import sys

def extract_unique_stations(zip_dir, output_csv_path):
    unique_stations = {}
    row_counter = 0

    def print_progress(count):
        sys.stdout.write(f'\rProcessed rows: {count:,}')
        sys.stdout.flush()

    for zip_filename in os.listdir(zip_dir):
        if not zip_filename.endswith('.zip'):
            continue

        zip_path = os.path.join(zip_dir, zip_filename)
        with zipfile.ZipFile(zip_path, 'r') as zf:
            for csv_filename in zf.namelist():
                if not csv_filename.endswith('.csv'):
                    continue

                with zf.open(csv_filename) as csvfile:
                    reader = csv.DictReader(
                        (line.decode('utf-8') for line in csvfile),
                        delimiter=','
                    )

                    for row in reader:
                        row_counter += 1
                        if row_counter % 50000 == 0:
                            print_progress(row_counter)

                        for station_type in ['start', 'end']:
                            station_id_key = f'{station_type}_station_id'
                            station_name_key = f'{station_type}_station_name'
                            station_lat_key = f'{station_type}_lat'
                            station_lng_key = f'{station_type}_lng'

                            station_id = row.get(station_id_key)
                            if station_id and station_id not in unique_stations:
                                unique_stations[station_id] = {
                                    'station_id': station_id,
                                    'station_name': row.get(station_name_key, ''),
                                    'station_lat': row.get(station_lat_key, ''),
                                    'station_lng': row.get(station_lng_key, '')
                                }

    print_progress(row_counter)
    print('\nWriting output...')

    os.makedirs(os.path.dirname(output_csv_path), exist_ok=True)
    with open(output_csv_path, 'w', newline='', encoding='utf-8') as f_out:
        writer = csv.DictWriter(f_out, fieldnames=['station_id', 'station_name', 'station_lat', 'station_lng'])
        writer.writeheader()
        writer.writerows(unique_stations.values())

    print(f'Done. Saved to {output_csv_path}')

if __name__ == "__main__":
    extract_unique_stations("../../private/raw_data/2024/", "../../private/stage0/station_list.csv")

