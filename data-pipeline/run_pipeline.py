#!/usr/bin/env python3
import yaml
import importlib
import logging
from pathlib import Path
from datetime import datetime, timedelta
import shutil 

# Load config
def load_config(config_path="config.yaml"):
  with open(config_path, "r") as f:
    return yaml.safe_load(f)

def load_stages(stages_dir="stages"):
  stage_files = sorted(Path(stages_dir).glob("stage_*.py"))
  stage_modules = []

  for f in stage_files:
    module_name = f.stem
    module = importlib.import_module(f"stages.{module_name}")
    stage_modules.append(module)
  return stage_modules

def load_metadata(metadata_file):
  if Path(metadata_file).exists():
    with open(metadata_file, "r") as f:
      return yaml.safe_load(f)
  return {"last_run": None, "completed_stages": []}

def save_metadata(metadata_file, metadata):
  with open(metadata_file, "w") as f:
    yaml.dump(metadata, f)

def main():
  # Load config
  config = load_config()
  input_dir = Path(config["input_dir"])
  output_dir = Path(config["output_dir"])
  work_dir = Path(config["work_dir"])
  work_dir.mkdir(parents=True, exist_ok=True)
  output_dir.mkdir(parents=True, exist_ok=True)
  metadata_file = Path(config["metadata_file"])

  # Setup logging
  logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
  
  # Load processing stages
  stages = load_stages()

  # Load metadata and setup resuming the pipeline
  metadata = load_metadata(metadata_file)
  now = datetime.now()
  resume = False
  last_run_str = metadata.get("last_run")
  if last_run_str:
    last_run_time = datetime.fromisoformat(last_run_str)
    if now - last_run_time < timedelta(hours=1):
      resume = True
  
  completed_stages = set(metadata.get("completed_stages", []))

  if not resume:
    # Flush all content out of the work_dir
    if work_dir.exists() and any(work_dir.iterdir()):
      print(f"[CLEAN] Removing previous work_dir contents at {work_dir}")
      shutil.rmtree(work_dir)
    work_dir.mkdir(parents=True, exist_ok=True)

  for stage in stages:
    if resume and stage.__name__ in completed_stages:
      print(f"\n=== [SKIP]: Stage {stage.__name__} recently completed successfully.")
      continue
    else:
      print(f"\n=== [RUN]: Starting stage {stage.__name__} ===")

    stage_exit = stage.run(input_dir, work_dir, output_dir)

    if stage_exit == False:
      print(f"\n  - Error: Encountered an error in {stage.__name__}. Aborting.")
      break
    else:
      completed_stages.add(stage.__name__)
      metadata["completed_stages"] = list(completed_stages)
      metadata["last_run"] = now.isoformat()
      save_metadata(metadata_file, metadata)

if __name__ == "__main__":
  main()