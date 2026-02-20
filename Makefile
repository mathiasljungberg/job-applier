.PHONY: dev dev-backend dev-frontend build run install clean

# Development - runs both servers
dev:
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	cd backend && uv run uvicorn job_applier.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

# Install all dependencies
install:
	cd backend && uv sync
	cd frontend && npm install

# Build frontend for production
build:
	cd frontend && npm run build

# Run production server (serves built frontend)
run: build
	cd backend && uv run uvicorn job_applier.main:app --host 0.0.0.0 --port 8000

clean:
	rm -rf frontend/dist
	rm -rf backend/.venv
	rm -rf frontend/node_modules
