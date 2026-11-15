"""vb_agent: a minimal Gemini coding agent used in the HiddenInk demo.

It reads a docs page and can install packages / write files in a sandboxed demo folder.
Three modes select how its fetch and actions are mediated:

  unprotected  - fetch_url returns the raw page (hidden text included); no action checks.
  layer1       - fetch_url calls the HiddenInk server's /api/safe-fetch (hidden text stripped).
  layer2       - every run_command / write_file is checked by /api/check-action first.
"""
__version__ = "0.1.0"
