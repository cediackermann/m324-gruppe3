# Docker API demo

Run these commands from `Code/` in one terminal. Docker Desktop must be running. The commands use the two PostgreSQL-backed services from `docker-compose.yml`; no local Bun server is needed.

```bash
docker compose up -d --build
docker compose ps
curl -sS -i http://localhost:3000/health
curl -sS -i http://localhost:3001/health
```

Both health requests should return `200 OK`. The bike API uses port 3000 and the tour API uses port 3001. Keep the same terminal for the variables below.

## User story 1: Create a bike

Use a fresh frame number on each demo run, then create a bike:

```bash
FRAME_NUMBER="DEMO-$(date +%s)-$RANDOM"
curl -sS -i -X POST http://localhost:3000/bikes \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"Ghost XY1\",\"frameNumber\":\"${FRAME_NUMBER}\",\"wheelHeight\":15}"
```

Expected: `201 Created`. The response contains the entered fields plus a generated `id` and `createdAt`. The bike is stored in the bike database.

Check the duplicate and invalid-input cases:

```bash
curl -sS -i -X POST http://localhost:3000/bikes \
  -H 'Content-Type: application/json' \
  -d "{\"type\":\"Another bike\",\"frameNumber\":\"${FRAME_NUMBER}\",\"wheelHeight\":15}"

curl -sS -i -X POST http://localhost:3000/bikes \
  -H 'Content-Type: application/json' \
  -d '{"type":"","frameNumber":"","wheelHeight":0}'
```

Expected: `409 Conflict` for the duplicate frame number and `400 Bad Request` with field details for invalid input.

## User story 2: List all bikes

```bash
curl -sS -i http://localhost:3000/bikes
curl -sS -i 'http://localhost:3000/bikes?unexpected=1'
```

The first request returns `200 OK` with a `bikes` array containing the bike's `id`, `type`, `frameNumber`, `wheelHeight`, and `createdAt`. The second returns `400 Bad Request` for an unsupported query. On a fresh database, calling `GET /bikes` before creating the first bike returns an empty array and a message. Existing Docker volumes keep earlier bikes.

Get the ID of the bike created above for the tour demo. If `jq` is installed, extract it automatically:

```bash
BIKE_ID=$(curl -fsS http://localhost:3000/bikes | jq -r --arg frame "$FRAME_NUMBER" '.bikes[] | select(.frameNumber == $frame) | .id')
echo "$BIKE_ID"
```

If `jq` is not available, copy `id` from the successful bike response and set `BIKE_ID` manually, for example `BIKE_ID='the-returned-id'`. Check that `echo "$BIKE_ID"` prints an ID before creating a tour.

## User story 3: Create a tour

The selected bike is checked through the bike API before the tour is stored in the separate tour database:

```bash
curl -sS -i -X POST http://localhost:3001/tours \
  -H 'Content-Type: application/json' \
  -d "{\"startLocation\":\"Bahnhofplatz, Niederhasli\",\"arrivalLocation\":\"Dorfstrasse, Oberhasli\",\"startsAt\":\"2030-05-01T09:00:00Z\",\"endsAt\":\"2030-05-01T11:00:00Z\",\"companion\":\"Sam Meyer\",\"bikeId\":\"${BIKE_ID}\"}"

curl -sS -i http://localhost:3001/tours
```

Expected: `201 Created` for the tour, then `200 OK` with the saved tour in the `tours` array.

Check place, time, and bike validation:

```bash
curl -sS -i -X POST http://localhost:3001/tours \
  -H 'Content-Type: application/json' \
  -d "{\"startLocation\":\"Same place\",\"arrivalLocation\":\"Same place\",\"startsAt\":\"2030-05-01T11:00:00Z\",\"endsAt\":\"2030-05-01T09:00:00Z\",\"companion\":\"Sam Meyer\",\"bikeId\":\"${BIKE_ID}\"}"

curl -sS -i -X POST http://localhost:3001/tours \
  -H 'Content-Type: application/json' \
  -d '{"startLocation":"Station","arrivalLocation":"Village","startsAt":"2030-05-01T09:00:00Z","endsAt":"2030-05-01T11:00:00Z","companion":"Sam Meyer","bikeId":"missing-bike"}'
```

Both requests should return `400 Bad Request`, with details for the invalid fields. To demonstrate dependency failure as well, temporarily stop only the bike API, repeat the valid tour request above, and then restart it:

```bash
docker compose stop bikes
curl -sS -i -X POST http://localhost:3001/tours \
  -H 'Content-Type: application/json' \
  -d "{\"startLocation\":\"Station\",\"arrivalLocation\":\"Village\",\"startsAt\":\"2030-05-01T09:00:00Z\",\"endsAt\":\"2030-05-01T11:00:00Z\",\"companion\":\"Sam Meyer\",\"bikeId\":\"${BIKE_ID}\"}"
docker compose start bikes
```

The tour request should return `503 Service Unavailable` while the bike API is stopped.

Stop the demo containers without deleting their data:

```bash
docker compose down
```
