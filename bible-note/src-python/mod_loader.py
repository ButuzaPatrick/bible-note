import os
import json
import importlib.util

MODS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "mods"))
print("MODS_DIR resolved to:", MODS_DIR)

def get_all_mods():
    """Returns list of mod manifests from each mod that exists"""
    mods = []
    
    if not os.path.exists(MODS_DIR):
        return mods
    
    for folder in os.listdir(MODS_DIR):
        manifest_path = os.path.join(MODS_DIR, folder, "mod.json")
        if os.path.exists(manifest_path):
            with open(manifest_path) as f:
                manifest = json.load(f)
                manifest["folder"] = folder
                mods.append(manifest)
    
    return mods

def run_mod_backend(mod_id, function_name="run"):
    # need to un-hardcode the main.py, want it to read the mod.json
    backend_path = os.path.join(MODS_DIR, mod_id, "main.py")
    
    print("Loading backend from:", backend_path)
    
    if not os.path.exists(backend_path):
        return None
    
    spec = importlib.util.spec_from_file_location(mod_id, backend_path)
    module = importlib.util.module_from_spec(spec)
    
    try:
        spec.loader.exec_module(module)
    except Exception as e:
        print("Error executing module:", e)
        return None
    func = getattr(module, function_name, None)
    print("Found function:", func)
    
    return getattr(module, function_name, None)

def get_mods_folder_fp():
    return MODS_DIR
