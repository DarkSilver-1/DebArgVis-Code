import logging

with open('app_logs.log', 'w'):
    pass
logging.basicConfig(level=logging.INFO)

# Remove the existing console handler
for handler in logging.root.handlers[:]:
    if isinstance(handler, logging.StreamHandler):
        logging.root.removeHandler(handler)

# Create a file handler for application logs
file_handler_app = logging.FileHandler('app_logs.log')
file_handler_app.setLevel(logging.INFO)

# Optionally, you can format the log messages for the log file differently
formatter_app = logging.Formatter('%(asctime)s: %(levelname)s: %(message)s')
file_handler_app.setFormatter(formatter_app)

# Add the handler to the root logger
logging.getLogger().addHandler(file_handler_app)
