# DEMO attacker collector (fictional). No dependencies beyond the Python standard library.
FROM python:3.12-alpine
WORKDIR /app
COPY server.py dashboard.html ./
EXPOSE 8788
CMD ["python", "-u", "server.py"]
