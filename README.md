# Social Media Platform 1.0.0

## Endpoints

Our endpoints are currently:

- `/` **[[GET](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/GET)]**
    - Main login screen, redirects to `/home` when you are already logged in.

- `/home` **[[GET](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/GET)]**
    - Main screen to view posts, create posts, etc.

- `/auth` **[[POST](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/POST)]**
    - Used in backend for authentication on login.

- `upload` **[[POST](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/POST)]**
    - Used in backend for uploading a picture to serverside.

## Use `docker compose`

1. `docker compose up -d --force-recreate`
2. `docker ps` -- MAKE SURE PROCCESS IS RUNNING
    - If not `docker compose logs mysql`, and see the error.
3. Should be all set.
