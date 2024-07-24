import logging

with open('app_logs.log', 'w'):
    pass
logging.basicConfig(level=logging.INFO)
for handler in logging.root.handlers[:]:
    if isinstance(handler, logging.StreamHandler):
        logging.root.removeHandler(handler)
file_handler_app = logging.FileHandler('app_logs.log')
file_handler_app.setLevel(logging.INFO)
formatter_app = logging.Formatter('%(asctime)s: %(levelname)s: %(message)s')
file_handler_app.setFormatter(formatter_app)
logging.getLogger().addHandler(file_handler_app)
