import os
import pandas as pd

def clean_csv_file(file_list, output_dir):
    """Process a batch of CSV files, cleaning and saving them."""
    for file_path in file_list:
        print(f"Cleaning file: {os.path.basename(file_path)}")
        
        # Read the CSV file into a pandas DataFrame
        df = pd.read_csv(file_path)

        # Drop the 'ride_id' column
        if 'ride_id' in df.columns:
            df.drop('ride_id', axis=1, inplace=True)

        # Map 'ridable_type' to numeric values
        if 'ridable_type' in df.columns:
            df['ridable_type'] = df['ridable_type'].map({'classic_bike': 0, 'electric_bike': 1})

        # Map 'member_casual' to numeric values
        if 'member_casual' in df.columns:
            df['member_casual'] = df['member_casual'].map({'member': 0, 'casual': 1})

        # Drop unnecessary columns
        for col in ['start_lat', 'start_lng', 'end_lat', 'end_lng']:
            if col in df.columns:
                df.drop(col, axis=1, inplace=True)

        # Create 'start_hour' column
        if 'started_at' in df.columns:
            df['start_hour'] = pd.to_datetime(df['started_at']).dt.strftime('%H').astype(int)

        # Create 'ride_time' column (difference between 'ended_at' and 'started_at')
        if 'started_at' in df.columns and 'ended_at' in df.columns:
            df['ride_time'] = (pd.to_datetime(df['ended_at']) - pd.to_datetime(df['started_at'])).dt.total_seconds()

        # Drop the 'started_at' and 'ended_at' columns
        for col in ['started_at', 'ended_at']:
            if col in df.columns:
                df.drop(col, axis=1, inplace=True)

        # Remove 'start_station_name' and 'end_station_name' columns
        for col in ['start_station_name', 'end_station_name']:
            if col in df.columns:
                df.drop(col, axis=1, inplace=True)

        # Save the cleaned DataFrame back to a new CSV file
        station_id = file_path.split(os.path.sep)[-3]  # Get the station ID from path
        file_name = os.path.basename(file_path)
        output_path = os.path.join(output_dir, station_id, file_name)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)

        print(f"Cleaned file saved to: {output_path}")

